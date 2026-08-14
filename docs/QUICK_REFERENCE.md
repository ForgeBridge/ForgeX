# ForgeX Quick Reference

## One-Page Cheat Sheet

---

### 🚀 Quick Commands

| Task | Command |
|------|---------|
| **Install all deps** | `npm ci` |
| **Build contracts** | `./scripts/build-contracts.sh` |
| **Run contract tests** | `cargo test --workspace --lib` |
| **Build SDK** | `npm run build -w packages/sdk` |
| **Typecheck SDK** | `npm run typecheck -w packages/sdk` |
| **Build web** | `npm run build -w apps/web` |
| **Typecheck web** | `npm run typecheck -w apps/web` |
| **Start dev server** | `npm run dev:web` |
| **Deploy testnet** | `gh workflow run deploy-testnet.yml` |
| **Format Rust** | `cargo fmt --all` |
| **Lint Rust** | `cargo clippy --all-targets -D warnings` |

---

### 📁 Project Structure

```
ForgeX/
├── contracts/              # Soroban smart contracts (Rust)
│   ├── token/              # SEP-41 Token
│   ├── factory/            # Token registry
│   └── bonding-curve/      # Exponential AMM
├── packages/
│   └── sdk/                # @forgex/sdk (TypeScript)
├── apps/
│   └── web/                # Next.js frontend
├── scripts/                # Build & deploy scripts
├── docs/                   # Documentation
└── .github/workflows/      # CI/CD
```

---

### 🔗 Key Contract Addresses (Testnet)

Deployed **2026-08-14**. Factory is initialized (admin = deployer) with one registered token (`FDEMO`).

| Contract | Address | Explorer |
|----------|---------|----------|
| Factory | `CBFMYDQDRJGOXYRKBDBBS2LQTAHHYYXUDAPGZVZJ2MEYJWHT3RGUSEJP` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CBFMYDQDRJGOXYRKBDBBS2LQTAHHYYXUDAPGZVZJ2MEYJWHT3RGUSEJP) |
| Bonding Curve | `CD7Q2RTRO7L2TC4WJSNVNONIWZFHVGAZGEXFI4INEK4QMEJ3JO3K4FRN` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CD7Q2RTRO7L2TC4WJSNVNONIWZFHVGAZGEXFI4INEK4QMEJ3JO3K4FRN) |
| Token (`FDEMO`) | `CBYT6KPTULCXJSYIEUTWZJKKWF6B7S7SZIJRZCKSO4H5QSE5ZKQ2E6OI` | [StellarExpert](https://stellar.expert/explorer/testnet/contract/CBYT6KPTULCXJSYIEUTWZJKKWF6B7S7SZIJRZCKSO4H5QSE5ZKQ2E6OI) |

---

### 📦 SDK Imports

```typescript
import {
  ForgeXClient,
  TokenClient,
  FactoryClient,
  BondingCurveClient,
  SorobanClient,
  CreateTokenParams,
  TokenInfo,
  CurveInfo,
  CurveParams,
  formatXLM,
  parseXLM,
  validateAddress,
} from '@forgex/sdk'
```

---

### ⚡ Common SDK Patterns

```typescript
// 1. Initialize client
const client = new ForgeXClient({
  network: 'testnet',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  networkPassphrase: 'Test SDF Network ; September 2015'
})

// 2. Read-only queries (no signing)
const tokens = await client.factory(FACTORY_ID).getAllTokens()
const token = await client.factory(FACTORY_ID).getToken(TOKEN_ID)
const price = await client.bondingCurve(CURVE_ID).getPrice()
const curve = await client.bondingCurve(CURVE_ID).getCurveInfo()

// 3. Write operations (require signer)
const signer = async (envelopeXdr: string) => {
  const freighter = await import('@stellar/freighter-api')
  const result = await freighter.signTransaction(envelopeXdr, { networkPassphrase, address })
  return result.signedTxXdr
}

const result = await client.bondingCurve(CURVE_ID).buy(
  userAddress,
  amountOut,
  maxCost,
  deadline,
  { source: userAddress, signers: [signer] }
)

// 4. Token operations
await client.token(TOKEN_ID).transfer(from, to, amount, options)
const balance = await client.token(TOKEN_ID).balanceOf(address)
```

---

### 🎨 Design Tokens (CSS Variables)

```css
:root {
  --forgex-primary: 142 76% 36%;
  --forgex-surface: 0 0% 100%;
  --forgex-text: 222 47% 11%;
  --forgex-text-muted: 215 16% 47%;
  --forgex-border: 214 32% 91%;
  --forgex-success: 142 76% 36%;
  --forgex-error: 0 84% 60%;
}
```

**Tailwind usage:**
```tsx
<div className="bg-forgex-surface text-forgex-text border-forgex-border rounded-forgex-lg shadow-forgex p-4">
<button className="bg-forgex-primary text-forgex-text-inverse hover:bg-forgex-primary-hover px-4 py-2 rounded-forgex">
```

---

### 🌐 Environment Variables

```bash
# Frontend (apps/web/.env.local)
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
NEXT_PUBLIC_FACTORY_CONTRACT_ID=
NEXT_PUBLIC_BONDING_CURVE_CONTRACT_ID=
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud

# Deployer (scripts/.env)
SOROBAN_ACCOUNT=S...
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
SOROBAN_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
```

---

### 🧪 Test Commands

| Scope | Command |
|-------|---------|
| All contracts | `cargo test --workspace --lib` |
| Token only | `cd contracts/token && cargo test --lib` |
| Factory only | `cd contracts/factory && cargo test --lib` |
| Curve only | `cd contracts/bonding-curve && cargo test --lib` |
| SDK typecheck | `npm run typecheck -w packages/sdk` |
| Web typecheck | `npm run typecheck -w apps/web` |
| SDK lint | `npm run lint -w packages/sdk` |
| Web lint | `npm run lint -w apps/web` |

---

### 📚 Key Documentation

| Doc | Path |
|-----|------|
| Deployment Runbook | `docs/DEPLOYMENT_RUNBOOK.md` |
| Security Policy | `docs/SECURITY_POLICY.md` |
| SDK API Reference | `docs/SDK_API_REFERENCE.md` |
| Contract Contributing | `docs/CONTRIBUTING_CONTRACTS.md` |
| ADR Index | `docs/ADR_INDEX.md` |
| Environment Setup | `docs/ENVIRONMENT_SETUP.md` |
| Theming Guide | `docs/THEMING_DESIGN_TOKENS.md` |
| License Compliance | `docs/LICENSE_COMPLIANCE.md` |

---

### 🔧 Troubleshooting

| Issue | Fix |
|-------|-----|
| `soroban: command not found` | `cargo install --locked soroban-cli` |
| `wasm32v1-none target missing` | `rustup target add wasm32v1-none` |
| `BigInt literals error` | Use `BigInt(100)` not `100n` (or target ES2020) |
| `getPublicKey not found` | Use `freighter.getAddress()` not `getPublicKey()` |
| `Transaction simulation failed` | Check contract params, balance, admin auth |
| `Contract not found` | Verify contract ID matches network (testnet/mainnet) |
| `Insufficient balance` | Fund account via Friendbot (testnet) |

---

### 📊 Network Constants

| Constant | Testnet | Mainnet |
|----------|---------|---------|
| RPC URL | `https://soroban-testnet.stellar.org` | `https://soroban.stellar.org` |
| Passphrase | `Test SDF Network ; September 2015` | `Public Global Stellar Network ; September 2015` |
| Friendbot | `https://friendbot.stellar.org` | N/A |
| Explorer | `https://stellar.expert/explorer/testnet` | `https://stellar.expert/explorer/public` |

---

### 📈 Curve Parameters (Defaults)

```typescript
const CURVE_DEFAULTS = {
  initialPrice: 100,           // 100 stroops = 0.00001 XLM
  steepness: 1,                // Gentle exponential
  reserveTarget: 500_000_000_000, // 500,000 XLM in stroops
}
```

**Formula:** `P(S) = P₀ × e^(k×S)` where `SCALE = 10^7`

---

### 🔐 Security Contacts

| Purpose | Contact |
|---------|---------|
| Security vulnerabilities | security@forgex.app |
| License questions | legal@forgex.app |
| General questions | dev@forgex.app |

---

### 📝 Git Workflow

```bash
# Feature branch
git checkout -b feat/short-description

# Conventional commits
git commit -m "feat(scope): description"
git commit -m "fix(scope): description"
git commit -m "docs(scope): description"
git commit -m "test(scope): description"
git commit -m "refactor(scope): description"

# Push & PR
git push origin feat/short-description
gh pr create --fill
```

---

### 🏷️ Release Tags

```bash
# Contracts
git tag -a contracts/v1.2.0 -m "Release contracts v1.2.0"
git push origin contracts/v1.2.0

# SDK
git tag -a sdk/v0.2.0 -m "Release SDK v0.2.0"
git push origin sdk/v0.2.0
```

---

*Last updated: 2024-08-13*