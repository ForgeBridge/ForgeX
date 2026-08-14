# Deployment Runbook

## Overview

This runbook covers deploying ForgeX contracts to Stellar Testnet and Mainnet, plus the frontend to Vercel.

## Prerequisites

- **Node.js 18+** and **Rust toolchain** (latest stable)
- **soroban CLI**: `cargo install --locked soroban-cli`
- **Stellar account** funded with testnet XLM (for testnet) or mainnet XLM (for mainnet)
- **GitHub repository** with secrets configured (see below)

## Environment Setup

### 1. Clone and Install

```bash
git clone https://github.com/ForgeBridge/ForgeX
cd ForgeX

# Install Node dependencies
npm ci

# Build contracts
./scripts/build-contracts.sh
```

### 2. Configure Environment Variables

Copy the example and fill in your values:

```bash
cp .env.example .env.local
```

**Required variables:**

| Variable | Description | Testnet Default |
|----------|-------------|-----------------|
| `SOROBAN_ACCOUNT` | Secret key of deployer account (starts with `S...`) | — |
| `SOROBAN_RPC_URL` | Soroban RPC endpoint | `https://soroban-testnet.stellar.org` |
| `SOROBAN_NETWORK_PASSPHRASE` | Network passphrase | `Test SDF Network ; September 2015` |
| `NEXT_PUBLIC_FACTORY_CONTRACT_ID` | Deployed factory contract ID | (set after deploy) |
| `NEXT_PUBLIC_BONDING_CURVE_CONTRACT_ID` | Deployed curve contract ID | (set after deploy) |
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | Frontend RPC URL | `https://soroban-testnet.stellar.org` |
| `NEXT_PUBLIC_NETWORK_PASSPHRASE` | Frontend network passphrase | `Test SDF Network ; September 2015` |

### 3. Fund Deployer Account (Testnet Only)

```bash
# Option A: Friendbot
curl -X POST "https://friendbot.stellar.org?addr=$(soroban keys address --key deployer)"

# Option B: Script
export SOROBAN_ACCOUNT=<your-secret-key>
./scripts/fund-testnet.sh
```

---

## Testnet Deployment

### Current Live Deployed Contracts

Deployed **2026-08-14** to Stellar Testnet. Factory is initialized with admin = deployer and one token (`FDEMO`) is registered.

| Contract | Address | Explorer |
|---|---|---|
| Factory | `CBFMYDQDRJGOXYRKBDBBS2LQTAHHYYXUDAPGZVZJ2MEYJWHT3RGUSEJP` | https://stellar.expert/explorer/testnet/contract/CBFMYDQDRJGOXYRKBDBBS2LQTAHHYYXUDAPGZVZJ2MEYJWHT3RGUSEJP |
| Bonding Curve | `CD7Q2RTRO7L2TC4WJSNVNONIWZFHVGAZGEXFI4INEK4QMEJ3JO3K4FRN` | https://stellar.expert/explorer/testnet/contract/CD7Q2RTRO7L2TC4WJSNVNONIWZFHVGAZGEXFI4INEK4QMEJ3JO3K4FRN |
| Token (`FDEMO`) | `CBYT6KPTULCXJSYIEUTWZJKKWF6B7S7SZIJRZCKSO4H5QSE5ZKQ2E6OI` | https://stellar.expert/explorer/testnet/contract/CBYT6KPTULCXJSYIEUTWZJKKWF6B7S7SZIJRZCKSO4H5QSE5ZKQ2E6OI |

Also available in `lab.stellar.org` (see start of this doc's discovery) and saved to `.env.testnet`.

### Automated (GitHub Actions)

1. Push to `main` branch or trigger workflow manually
2. GitHub Actions workflow `.github/workflows/deploy-testnet.yml` runs:
   - Builds contracts
   - Deploys token, factory, bonding-curve contracts
   - Outputs contract IDs to workflow summary
   - Updates environment if configured

**Manual trigger:**
```bash
gh workflow run deploy-testnet.yml
```

### Manual Deployment

```bash
# 1. Ensure environment is loaded
source .env.local

# 2. Deploy token contract
soroban contract deploy \
  --wasm target/wasm32v1-none/release/forgex_token.wasm \
  --source $SOROBAN_ACCOUNT \
  --rpc-url $SOROBAN_RPC_URL \
  --network-passphrase "$SOROBAN_NETWORK_PASSPHRASE" \
  --fee 1000000

# Save output as TOKEN_CONTRACT_ID

# 3. Deploy bonding curve contract
soroban contract deploy \
  --wasm target/wasm32v1-none/release/forgex_bonding_curve.wasm \
  --source $SOROBAN_ACCOUNT \
  --rpc-url $SOROBAN_RPC_URL \
  --network-passphrase "$SOROBAN_NETWORK_PASSPHRASE" \
  --fee 1000000

# Save output as CURVE_CONTRACT_ID

# 4. Deploy factory contract
soroban contract deploy \
  --wasm target/wasm32v1-none/release/forgex_factory.wasm \
  --source $SOROBAN_ACCOUNT \
  --rpc-url $SOROBAN_RPC_URL \
  --network-passphrase "$SOROBAN_NETWORK_PASSPHRASE" \
  --fee 1000000

# Save output as FACTORY_CONTRACT_ID

# 5. Initialize factory (admin = deployer)
soroban contract invoke \
  --id $FACTORY_CONTRACT_ID \
  --source $SOROBAN_ACCOUNT \
  --rpc-url $SOROBAN_RPC_URL \
  --network-passphrase "$SOROBAN_NETWORK_PASSPHRASE" \
  --fee 1000000 \
  -- \
  initialize \
  --admin $(soroban keys address --key $SOROBAN_ACCOUNT)

# 6. Create first token through factory
soroban contract invoke \
  --id $FACTORY_CONTRACT_ID \
  --source $SOROBAN_ACCOUNT \
  --rpc-url $SOROBAN_RPC_URL \
  --network-passphrase "$SOROBAN_NETWORK_PASSPHRASE" \
  --fee 2000000 \
  -- \
  create_token \
  --params '{
    "token_id": "'$TOKEN_CONTRACT_ID'",
    "curve_id": "'$CURVE_CONTRACT_ID'",
    "name": "ForgeX Demo",
    "symbol": "FDEMO",
    "decimals": 7,
    "max_supply": 10000000000000000,
    "image_uri": "",
    "description": "Demo token",
    "curve_params": {
      "initial_price": 100,
      "steepness": 1,
      "reserve_target": 500000000000
    }
  }'
```

### Post-Deploy: Update Frontend Config

```bash
# Update .env.local with deployed contract IDs
NEXT_PUBLIC_FACTORY_CONTRACT_ID=$FACTORY_CONTRACT_ID
NEXT_PUBLIC_BONDING_CURVE_CONTRACT_ID=$CURVE_CONTRACT_ID

# Rebuild and restart frontend
npm run build:web
npm run dev:web
```

---

## Mainnet Deployment

⚠️ **Mainnet deployment requires additional approvals:**

1. **Security audit** — Formal audit by recognized firm
2. **Community review** — 2-week public review period
3. **Multi-sig governance** — Factory admin transferred to multi-sig

### Mainnet Prerequisites

- Mainnet XLM funded account (minimum 100 XLM for fees)
- Multi-sig account configured (3-of-5 recommended)
- Audit report published

### Deployment Steps

```bash
# 1. Set mainnet environment
export SOROBAN_RPC_URL=https://soroban.stellar.org
export SOROBAN_NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
export SOROBAN_ACCOUNT=<multi-sig-account>

# 2. Deploy contracts (same as testnet, higher fees)
# Use --fee 5000000 for mainnet

# 3. Initialize factory with multi-sig as admin
# 4. Transfer factory admin to governance multi-sig
soroban contract invoke \
  --id $FACTORY_CONTRACT_ID \
  --source $SOROBAN_ACCOUNT \
  --rpc-url $SOROBAN_RPC_URL \
  --network-passphrase "$SOROBAN_NETWORK_PASSPHRASE" \
  -- \
  set_admin \
  --new_admin <multi-sig-address>

# 5. Verify deployment
soroban contract invoke \
  --id $FACTORY_CONTRACT_ID \
  --rpc-url $SOROBAN_RPC_URL \
  --network-passphrase "$SOROBAN_NETWORK_PASSPHRASE" \
  -- \
  get_admin
```

---

## Frontend Deployment (Vercel)

### 1. Connect Repository

```bash
# Install Vercel CLI
npm i -g vercel

# Login and link
vercel login
vercel link
```

### 2. Configure Environment Variables in Vercel

Add all `NEXT_PUBLIC_*` variables from `.env.local` to Vercel project settings → Environment Variables.

### 3. Deploy

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

### 4. Custom Domain (Optional)

```bash
vercel domains add forgex.app
vercel alias set <deployment-url> forgex.app
```

---

## Verification Checklist

After each deployment, verify:

- [ ] Factory contract initialized: `get_admin` returns expected admin
- [ ] Token contract deployed: `name`, `symbol`, `decimals` match
- [ ] Bonding curve contract: `get_price` returns initial price (100 stroops)
- [ ] Create token flow: Factory `create_token` emits `TokenCreated` event
- [ ] Buy/sell flow: Curve `buy`/`sell` execute without panic
- [ ] Frontend loads: Token feed shows created tokens
- [ ] Wallet connect: Freighter integration works

---

## Rollback Procedure

### Contract Rollback

Soroban contracts are immutable. To "rollback":

1. Deploy new contract version with fix
2. Update frontend to use new contract IDs
3. If factory needs upgrade: Deploy new factory, migrate registry data (manual process)

### Frontend Rollback

```bash
# Vercel: Promote previous deployment
vercel rollback <deployment-url>

# Or redeploy previous commit
git revert <bad-commit>
vercel --prod
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        TESTNET / MAINNET                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────┐    ┌──────────────────┐    ┌─────────────┐  │
│   │   Deployer   │───▶│  Soroban RPC     │───▶│  Contracts  │  │
│   │  (Account)   │    │  (RPC Endpoint)  │    │  (WASM)     │  │
│   └──────────────┘    └──────────────────┘    └──────┬──────┘  │
│                                                      │         │
│                    ┌─────────────────────────────────┼───────┐ │
│                    ▼                                 ▼       ▼ │
│             ┌─────────────┐                 ┌──────────┐┌──────┐ │
│             │   Token     │                 │ Factory  ││Curve │ │
│             │  Contract   │◀────────────────│ Contract ││Contract│
│             └─────────────┘   registers     └──────────┘└──────┘ │
│                    ▲                                 │          │
│                    │ creates token+curve              │          │
│                    ▼                                 ▼          │
│             ┌────────────────────────────────────────────────┐  │
│             │              Stellar Ledger                     │  │
│             └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vercel)                        │
├─────────────────────────────────────────────────────────────────┤
│  Next.js App ──▶ @forgex/sdk ──▶ Soroban RPC ──▶ Contracts     │
│       │                                                        │
│       ▼                                                        │
│  Freighter Wallet                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| `Error: insufficient balance` | Deployer account not funded | Fund with Friendbot (testnet) or buy XLM (mainnet) |
| `Error: contract not found` | Wrong contract ID or network | Verify `NEXT_PUBLIC_*_CONTRACT_ID` matches deployed ID |
| `Error: simulation failed` | Invalid params or contract panic | Check contract logs via `soroban contract invoke --debug` |
| `Wallet connect fails` | Freighter not installed / wrong network | Install Freighter extension; ensure testnet selected |
| `Build fails: target not found` | Missing wasm target | `rustup target add wasm32v1-none` |

---

## Useful Commands

```bash
# Check contract info
soroban contract info --id <CONTRACT_ID> --rpc-url <RPC_URL>

# Invoke read-only
soroban contract invoke --id <ID> --rpc-url <URL> -- get_token_count

# View events
soroban contract events --id <ID> --rpc-url <URL> --start-ledger 0

# Get account info
soroban keys address --key <SECRET>
soroban keys public-key --key <SECRET>
```