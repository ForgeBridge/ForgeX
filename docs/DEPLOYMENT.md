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

## Current Testnet Deployment

Deployed on **2026-08-14** to Stellar Testnet (`https://soroban-testnet.stellar.org`). All three contracts are live and the factory has been initialized with the deployer as admin.

| Contract | Address | Explorer |
|---|---|---|
| Factory | `CBFMYDQDRJGOXYRKBDBBS2LQTAHHYYXUDAPGZVZJ2MEYJWHT3RGUSEJP` | https://stellar.expert/explorer/testnet/contract/CBFMYDQDRJGOXYRKBDBBS2LQTAHHYYXUDAPGZVZJ2MEYJWHT3RGUSEJP |
| Bonding Curve | `CD7Q2RTRO7L2TC4WJSNVNONIWZFHVGAZGEXFI4INEK4QMEJ3JO3K4FRN` | https://stellar.expert/explorer/testnet/contract/CD7Q2RTRO7L2TC4WJSNVNONIWZFHVGAZGEXFI4INEK4QMEJ3JO3K4FRN |
| Token (ForgeX Demo `FDEMO`) | `CBYT6KPTULCXJSYIEUTWZJKKWF6B7S7SZIJRZCKSO4H5QSE5ZKQ2E6OI` | https://stellar.expert/explorer/testnet/contract/CBYT6KPTULCXJSYIEUTWZJKKWF6B7S7SZIJRZCKSO4H5QSE5ZKQ2E6OI |

Lab link: https://lab.stellar.org/r/testnet/contract/CBFMYDQDRJGOXYRKBDBBS2LQTAHHYYXUDAPGZVZJ2MEYJWHT3RGUSEJP

The values are also saved to `.env.testnet` (gitignored) and mirrored to `.env.local` for the frontend.

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
