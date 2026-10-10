# ForgeX — EVM contracts (Arc)

Solidity implementation of the ForgeX contracts, deployed to
[Circle's Arc](https://docs.arc.io): an EVM L1 where gas is paid in **USDC**.

| Chain | RPC | Chain id | Explorer |
|---|---|---|---|
| Arc testnet | `https://rpc.testnet.arc.io` | `5042002` | `https://explorer.testnet.arc.io` |
| Arc mainnet | `https://rpc.mainnet.arc.io` | `5042` | `https://explorer.arc.io` |

The Soroban suite in `contracts/stellar` is independent and untouched. This
directory is a second deployment of the same protocol, not a build step of the
first.

## Layout

```
src/
├── libraries/BondingCurveMath.sol  P(S) = P0 * e^(k*S), ported bit-for-bit from Rust
├── ForgeXToken.sol                 SEP-41 token surface over an upgradeable ERC20
├── ForgeXCurve.sol                 exponential bonding curve, holds the quote asset
├── ForgeXFactory.sol               permissionless launchpad and registry
└── ForgeXProxy.sol                 minimal ERC1967 proxy, one per forged token/curve
test/                               Foundry ports of the Rust test suites
script/Deploy.s.sol                 deployment script
```

Each forged token gets **two** proxies — one for the token, one for the curve —
both initialized in the same transaction as their creation. The factory stores
the shared implementations rather than embedding the token and curve bytecode,
which is what keeps the factory at ~11KB of the 24KB limit.

## Commands

```bash
cd contracts/evm
forge build --sizes
forge test
forge test --match-contract BondingCurveMathTest -vv

# deploy (see docs/DEPLOYMENT_ARC.md)
cd ../..
./scripts/deploy-arc.sh --dry-run
```

## Parity with Soroban

The curve math is the part that must agree across chains, so
`BondingCurveMath.sol` mirrors `contracts/stellar/bonding-curve/src/math.rs`
exactly:

- `SCALE = 1e7` and a 20-term Taylor series for `e^x`, with the same
  truncate-toward-zero division.
- Arithmetic is **bounded to the Soroban `i128` range**, so where Rust's
  `checked_mul` breaks out of the series, Solidity stops at the same term.
  Without that bound the two chains quote different prices once prices leave the
  comfortable range.
- The expected values in `test/BondingCurveMath.t.sol` were generated from the
  Rust implementation. Changing one without the other will fail this suite.

Deliberate differences, all required to work on an EVM chain:

| Soroban | Arc |
|---|---|
| Curve is an accounting layer; the caller settles payment | Curve pulls the quote on `buy`, pays out on `sell`, mints and burns |
| `transfer(from, to, amount)` | `admin_transfer` (EVM's `transfer` has a different signature) |
| Explicit `buyer`/`seller`/`creator` argument, authorized | `msg.sender` |
| `upgrade(new_wasm_hash)` | `upgrade(address)` on the per-token proxy |
| WASM hashes in the factory | Implementation addresses in the factory |
| Names and symbols found by registry scan | Same behaviour, bounded-cost mapping |

## Test suites

| Suite | Tests | Covers |
|---|---|---|
| `BondingCurveMathTest` | 14 | curve-math parity vectors from the Rust implementation |
| `ForgeXCurveTest` | 44 | buys, sells, fees, limits, graduation, deadlines, reentrancy, both quote modes |
| `ForgeXTokenTest` | 36 | ERC20 parity, mint/burn, pause, authorization, admin transfer, hooks, upgrades |
| `ForgeXFactoryTest` | 25 | permissionless forging, live-code checks, registry, pagination, admin surface |

## Upgrading

Every token and curve is its own proxy, so its admin upgrades it independently:

```solidity
ForgeXToken(token).upgrade(address(newImplementation));   // bumps the implementation version
```

Replacing the factory's implementations (`set_token_implementation`,
`set_curve_implementation`) only affects tokens forged afterwards.

Because the implementations are shared, **storage layouts must stay append-only**.
Adding a field at the end of `ForgeXToken` or `ForgeXCurve` is safe; reordering or
removing one silently corrupts every existing token's state.
