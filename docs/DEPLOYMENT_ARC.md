# Deploying to Arc

This runbook covers the EVM deployment at `contracts/evm`, which runs on
Circle's **Arc** — an EVM L1 that settles in USDC. The Stellar/Soroban deployment
is unchanged and lives in [DEPLOYMENT.md](./DEPLOYMENT.md).

| | Arc | Stellar |
|---|---|---|
| Contracts | `contracts/evm` (Solidity) | `contracts/stellar` (Rust/WASM) |
| Toolchain | Foundry (`forge`) | `cargo` + `soroban-cli` |
| Testnet RPC | `https://rpc.testnet.arc.io` | `https://soroban-testnet.stellar.org` |
| Mainnet RPC | `https://rpc.mainnet.arc.io` | `https://soroban.stellar.org` |
| Chain id | 5042002 (testnet) / 5042 (mainnet) | network passphrase |
| Gas | **USDC** | XLM |
| Explorer | `https://explorer.testnet.arc.io` | `stellar.expert` |

## Prerequisites

```bash
# Foundry (forge, cast, anvil)
curl -L https://foundry.paradigm.xyz | bash && foundryup

# Testnet USDC for gas
#   https://faucet.circle.com   (Arc testnet)
```

## 1. Build and test

```bash
cd contracts/evm
forge build --sizes
forge test
```

`--sizes` prints contract sizes; all are well under the 24KB EIP-170 limit
(largest is the factory at ~10.9KB, because it embeds only the 330-byte proxy
and stores the shared implementations).

## 2. Configure the deployment

```bash
# Inside contracts/evm, or export for the deploy script
export ARC_RPC_URL=https://rpc.testnet.arc.io
export ARC_CHAIN_ID=5042002
export PRIVATE_KEY=0x...           # or use --ledger below
export ARC_USDC=                   # ERC20 quote; empty uses the native gas token
export FACTORY_ADMIN=              # defaults to the deployer
```

Add the chain to MetaMask with the RPC and chain id above, currency **USDC**.

## 3. Deploy

```bash
# From the repo root: builds, tests, then broadcasts after a confirmation prompt
./scripts/deploy-arc.sh

# Or directly:
cd contracts/evm
forge script script/Deploy.s.sol:Deploy --rpc-url $ARC_RPC_URL --broadcast
```

The script deploys `ForgeXToken`, `ForgeXCurve` and `ForgeXFactory`, sets the
quote asset, and writes `contracts/evm/deployments/arc-testnet.json`.

For a deployment from a hardware wallet:

```bash
cd contracts/evm
forge script script/Deploy.s.sol:Deploy --rpc-url $ARC_RPC_URL --broadcast --ledger
```

Note that `forge script` on Arc may need a retry: the primary RPC is
load-balanced and can return `-32014` for a block near the chain head. Back off
and rerun; the deployment is idempotent in that no state is written twice, but
the addresses change, so re-read `deployments/*.json` afterwards.

## 4. Verify the deployment

```bash
FACTORY=$(jq -r .factory contracts/evm/deployments/arc-testnet.json)

cast call $FACTORY "get_admin()" --rpc-url $ARC_RPC_URL
cast call $FACTORY "token_count()" --rpc-url $ARC_RPC_URL
cast code $FACTORY --rpc-url $ARC_RPC_URL | wc -c   # non-empty
```

Then open `https://explorer.testnet.arc.io/address/$FACTORY` and check that the
swap, forge and quote functions are present.

## 5. Forge a token and trade

```solidity
// params: name, symbol, decimals, maxSupply, imageUri, description,
//         initialPrice, steepness, reserveTarget
factory.create_token((string, string, uint8, uint256, string, string,
                     int256, int256, int256));

// the curve settles in the quote asset; for the native gas token attach the quote
curve.quote_buy(1000)                      // amount owed, fees included
curve.buy{value: owed}(1000, owed, deadline)
curve.sell(1000, 0, deadline)
```

## 6. Point the frontend at Arc

```env
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.io
NEXT_PUBLIC_ARC_CHAIN_ID=5042002
NEXT_PUBLIC_ARC_FACTORY_ADDRESS=<factory>
NEXT_PUBLIC_ARC_QUOTE_TOKEN_ADDRESS=0x0000000000000000000000000000000000000000
```

The frontend keeps running on Stellar when these are unset; setting them adds
Arc as a second network.

## Network differences worth knowing

**Gas is USDC.** Deployment and every trade is paid in USDC, so keep enough on
the deployer. Curve fees are also denominated in the same 6-decimal asset.

**The curve is custodian.** The Soroban curve is an accounting layer that never
holds XLM; the EVM curve holds the quote asset between the reserve and the
withdrawable fee tally. `withdraw_fees` asserts
`quote.balanceOf(curve) >= reserve + fees` before paying out, so fees can never
be paid from the reserve that backs sellers.

**Upgrades are per-token, not global.** Each forged token and curve is an
ERC1967 proxy over a shared implementation, and its own admin can call
`upgrade(newImplementation)` — the equivalent of the Soroban
`upgrade(new_wasm_hash)`. Replacing the factory's implementations only affects
tokens forged afterwards.

**Sell burns before it pays.** On Arc a sale burns the seller's tokens before the
quote is transferred, so a reentrant payout cannot double-count.

**`eth_getLogs` limits.** Public endpoints reject ranges above 10,000 blocks
(`-32012`). Page through history in windows of 9,999 blocks.

## Rolling back

There is no rollback for a broadcast transaction. To recover from a bad
deployment:

1. Keep the factory and point new tokens at a fixed implementation with
   `set_token_implementation` / `set_curve_implementation`.
2. For an individual token or curve, its own admin can call `upgrade`.
3. To stop trading on a curve, the admin can `set_sell_limits(0, 0)` — buys are
   still possible, so prefer `set_cap(tokens_sold)` to freeze supply growth, or
   transfer the admin to a burn address.
