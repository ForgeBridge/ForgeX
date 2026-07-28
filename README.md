# ForgeX

> **Forge your token. Trade on the curve. Built on Stellar.**

ForgeX is an open-source token launchpad on the **Stellar blockchain** powered by **Soroban smart contracts**. Create, trade, and discover tokens through an exponential bonding curve AMM with zero upfront liquidity.

## Quick Start

```bash
# Prerequisites: Node.js 18+, Rust, soroban CLI
./scripts/initialize.sh    # Install deps, set up config
./scripts/build-contracts.sh  # Build WASM contracts
./scripts/deploy-testnet.sh   # Deploy to Stellar Testnet
npm run dev:web               # Start frontend
```

## Architecture

| Layer | Technology |
|---|---|
| Smart Contracts | Rust, Soroban SDK, WASM |
| Blockchain | Stellar (Testnet → Mainnet) |
| Frontend | Next.js 14, React, TypeScript, Tailwind |
| SDK | TypeScript, `@forgex/sdk` |
| Wallet | Freighter (`@stellar/freighter-api`) |

## Project Structure

```
forgex/
├── contracts/          # Rust/Soroban smart contracts
│   ├── token/          # SEP-41 Token contract
│   ├── factory/        # Token factory & registry
│   └── bonding-curve/  # Exponential AMM
├── packages/sdk/       # @forgex/sdk TypeScript package
├── apps/web/           # Next.js frontend
├── scripts/            # Build & deploy scripts
└── docs/               # Documentation
```

## Smart Contracts

- **Token Contract** — SEP-41 compatible token (mint, burn, transfer, balance, approve)
- **Factory Contract** — Singleton registry that creates and tracks all tokens
- **Bonding Curve Contract** — Exponential AMM: `P(S) = P₀ × e^(k×S)`

## Development Phases

1. Smart Contract Foundation ✅
2. Token Contract (SEP-41) ✅
3. Factory Contract ✅
4. Bonding Curve AMM ✅
5. SDK Package ✅
6. Frontend Scaffold ✅
7. Token Creation Flow ⏳
8. Trading Flow ⏳
9. Token Feed & Polish ⏳
10. Testnet Launch ⏳

## License

MIT OR Apache-2.0
