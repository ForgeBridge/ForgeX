# Deployment Guide

## Prerequisites

- Node.js 18+
- Rust toolchain
- soroban CLI (`cargo install soroban-cli`)
- Stellar account funded with testnet XLM

## Environment Setup

```bash
cp .env.example .env.local
# Configure your deployer account and RPC URLs
```

## Deploy to Testnet

```bash
# Build all contracts
./scripts/build-contracts.sh

# Fund deployer account (first time)
export SOROBAN_ACCOUNT=<your-secret-key>
./scripts/fund-testnet.sh

# Deploy contracts
./scripts/deploy-testnet.sh
```

## Deploy to Mainnet (v2)

Mainnet deployment requires:
1. Formal security audit
2. Community review
3. Multi-sig governance setup

See `ARCHITECTURE.md` for mainnet requirements.

## Frontend Deployment

```bash
# Build frontend
npm run build:web

# Deploy to Vercel
vercel --prod
```

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | Soroban RPC endpoint |
| `NEXT_PUBLIC_NETWORK_PASSPHRASE` | Network passphrase |
| `NEXT_PUBLIC_FACTORY_CONTRACT_ID` | Deployed factory contract ID |
| `NEXT_PUBLIC_IPFS_GATEWAY` | IPFS gateway for token metadata |
| `SOROBAN_ACCOUNT` | Deployer secret key (scripts only) |
