# ⚒️ ForgeX

> **Forge your token. Trade on the curve. Built on Stellar.**

ForgeX is an open-source **token launchpad on the Stellar blockchain**, powered by **Soroban smart contracts**. Anyone can create, trade, and discover tokens through an **exponential bonding curve AMM** — no upfront liquidity required. Every token starts as a fair launch: price rises along a deterministic exponential curve as supply is sold, and any holder can sell back into the reserve at any time.

**Deployed frontend:** https://forgex.pxxl.click/

**Testnet contracts:**
- Factory: `CBFMYDQDRJGOXYRKBDBBS2LQTAHHYYXUDAPGZVZJ2MEYJWHT3RGUSEJP` → [StellarExpert](https://stellar.expert/explorer/testnet/contract/CBFMYDQDRJGOXYRKBDBBS2LQTAHHYYXUDAPGZVZJ2MEYJWHT3RGUSEJP)
- Bonding Curve: `CD7Q2RTRO7L2TC4WJSNVNONIWZFHVGAZGEXFI4INEK4QMEJ3JO3K4FRN` → [StellarExpert](https://stellar.expert/explorer/testnet/contract/CD7Q2RTRO7L2TC4WJSNVNONIWZFHVGAZGEXFI4INEK4QMEJ3JO3K4FRN)
- Token (`FDEMO`): `CBYT6KPTULCXJSYIEUTWZJKKWF6B7S7SZIJRZCKSO4H5QSE5ZKQ2E6OI` → [StellarExpert](https://stellar.expert/explorer/testnet/contract/CBYT6KPTULCXJSYIEUTWZJKKWF6B7S7SZIJRZCKSO4H5QSE5ZKQ2E6OI)

---

## Table of Contents

- [Highlights](#highlights)
- [How It Works — The Bonding Curve](#how-it-works--the-bonding-curve)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Smart Contracts](#smart-contracts)
  - [Token Contract](#1-token-contract-sep-41)
  - [Factory Contract](#2-factory-contract)
  - [Bonding Curve Contract](#3-bonding-curve-contract)
  - [Contract Events](#contract-events)
- [TypeScript SDK (`@forgex/sdk`)](#typescript-sdk-forgexsdk)
- [Frontend (`apps/web`)](#frontend-appsweb)
- [Scripts](#scripts)
- [Quick Start](#quick-start)
- [Configuration / Environment Variables](#configuration--environment-variables)
- [Testing](#testing)
- [CI / CD](#ci--cd)
- [Documentation](#documentation)
- [Roadmap](#roadmap)
- [License](#license)

---

## Highlights

| Capability | Description |
|---|---|
| **Zero-liquidity launch** | Tokens launch instantly with no upfront liquidity provision |
| **Fair pricing** | Price is a deterministic exponential function of supply — no humans, no price manipulation |
| **Instant liquidity** | The bonding curve itself *is* the reserve; buy and sell any time |
| **Slippage & deadline guards** | `max_cost` / `min_payout` slippage limits + transaction deadlines on every trade |
| **Reentrancy protection** | A reentrancy guard blocks recursion during liquidity operations |
| **SEP-41 compatible token** | Standard Stellar token interface: mint, burn, transfer, approve, balance, allowance |
| **Admin-controlled safety** | Pause/unpause, fee rate (bps), buy/sell limits, supply cap, contract upgrade |
| **Rich events** | Structured `Buy`, `Sell`, `TokenCreated`, `AdminChanged`, and curve-admin events for indexers |
| **Live deployment** | Frontend deployed at https://forgex.pxxl.click (Testnet) |

---

## How It Works — The Bonding Curve

ForgeX is a "fair-launch" model. There is **no liquidity pool** in the traditional sense — instead, the bonding curve contract is the market itself:

```
┌────────────────────────────────────────────────────────────────────┐
│                          BONDING CURVE  (An AMM without pools)     │
│                                                                    │
│                          P(S) = P₀ × e^(k × S)                     │
│                                                                    │
│   Price                                                            │
│     ▲                                                              │
│     │                           ╱                                  │
│     │                         ╱                                    │
│     │                       ╱   ← price grows exponentially        │
│     │                     ╱                                        │
│     │                   ╱                                          │
│     │                 ╱       BUY:  you pay cost, mint new tokens  │
│     │               ╱            └─ reserve += cost                │
│     │             ╱      SELL:  you return tokens, get payout      │
│     │           ╱            └─ reserve -= payout                  │
│     │         ╱                                                    │
│     │   P₀   ●╱──────────────────────────────────────────────      │
│     └────────┴──────────────────────────────────────────────▶      │
│                                 Supply sold (S)                    │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### The Math

Soroban has no floating point, so all arithmetic is **fixed-point scaled by `SCALE = 10^7`**. `e^x` is computed with a **Taylor series approximation (up to 20 terms)**.

| Quantity | Formula |
|---|---|
| Token price at supply S | `P(S) = P₀ × e^(k×S)` where `P₀` = initial price, `k` = steepness |
| Cost to buy from S₁ → S₂ | `Cost = (P₀/k) × (e^(k×S₂) − e^(k×S₁))` |
| Payout selling S₂ → S₁ | `Payout = Cost(S₂ → S₁)` — the curve is **reversible** |
| Market cap | `price × tokens_sold` |
| Reserve ratio | `reserve / market_cap` (0 ⇒ empty, 1 ⇒ fully backed) |

**Default curve parameters** (used by the frontend):

| Parameter | Value | Meaning |
|---|---|---|
| `initial_price` | `100` (± `SCALE`) | 0.00001 XLM / token |
| `steepness` | `1` (± `SCALE`) | Gentle exponential rise |
| `reserve_target` | `500_000` XLM | Informational graduation target |
| `max_supply` | `1_000_000_000` | Max mintable supply |

The exponential curve means **early buyers pay the least** and later buyers pay more — a "fair launch" where the community drives price discovery.

---

## System Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│                             FRONTEND (Next.js 14)                         │
│  apps/web  ──  React 18 · TypeScript · Tailwind · zustand · Freighter     │
│                                                                           │
│   ┌────────────┐  ┌──────────────┐  ┌─────────────────┐  ┌───────────────┐ 
│   │ Token Feed │  │ Create Token │  │ Token Detail    │  │ Wallet (via  │ │
│   │ (/, sort)  │  │ (/create)    │  │ (/token/[id])   │  │ Freighter)   │ │
│   └────────────┘  └──────────────┘  └──┬──────────────┘  └───────────────┘ │
│                                        │  ├ PriceChart (lightweight-charts)│
│                                        │  ├ TradePanel (Buy / Sell)        │
│                                        │  ├ Slippage · QuotePreview        │
│                                        │  └ Stats · Recent Trades          │
│                                        │                                    │
│   Every route talks through the SDK ───┼─────────────────────────────────   │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │  @forgex/sdk (TypeScript)
 ┌───────────────────────────────────▼──────────────────────────────────────┐
 │                         TYPESCRIPT SDK (packages/sdk)                     │
 │                                                                           │
 │  ForgeXClient ── orchestrates: TokenClient · FactoryClient · CurveClient   │
 │  SorobanClient ── build ▸ simulate ▸ assemble-auth ▸ sign ▸ submit ▸ wait  │
 │  abi.ts · utils.ts ── ScVal encode/decode + amount/address formatting      │
 └───────────────────────────────────┬────────────────────────────────────────┘
                                     │ Soroban RPC (testnet / mainnet)
 ┌───────────────────────────────────▼──────────────────────────────────────┐
 │                          STELLAR / SOROBAN LAYER                          │
 │                                                                           │
 │  ┌────────────────────────────┐     ┌──────────────────────────────────┐  │
 │  │   FACTORY (singleton)      │     │   BONDING CURVE  (per token)     │  │
 │  │   · registry of tokens     │     │   · exponential AMM state        │  │
 │  │   · admin ownership        │◄────│   · reserve · fees · cap         │  │
 │  │   · TokenCreated event     │     │   · Buy / Sell · guards          │  │
 │  └──────────────┬─────────────┘     └──────────────┬───────────────────┘  │
 │                 │                                  │                      │
 │                 │   registers (token_id, curve_id) │                      │
 │                 └──────────────┐                   │                      │
 │                       ┌────────▼───────────────────▼─────────┐            │
 │                       │         TOKEN (SEP-41, per token)    │            │
 │                       │  mint · burn · transfer · approve    │            │
 │                       │  pause · upgrade · balanceOf         │            │
 │                       └─────────────────────────────────────┘            │
 └───────────────────────────────────────────────────────────────────────────┘
```

**Layered flow on a buy:**

1. User clicks **Buy** in the frontend with a `max_cost` slippage limit and deadline.
2. `apps/web` → `@forgex/sdk` `ForgeXClient` → `BondingCurveClient.buy(...)`.
3. `SorobanClient` builds + simulates the transaction, assembles auth, asks **Freighter** to sign, submits to the Soroban RPC, and waits for settlement.
4. The curve contract mints/transfers tokens via the token contract, credits the reserve, emits a `Buy` event, and updates `tokens_sold`/`price`.

---

## Project Structure

```
forgex/
├── apps/
│   └── web/                    # Next.js 14 frontend (deployed to forgex.pxxl.click)
│       ├── src/
│       │   ├── app/            # Routes: / , /create , /token/[id] , error/not-found
│       │   ├── components/
│       │   │   ├── tokens/     # TokenFeed · TokenCard · TokenAvatar · CreateTokenForm ...
│       │   │   ├── trade/      # TradePanel · BuyForm · SellForm · PriceChart · SlippageTolerance ...
│       │   │   ├── wallet/     # WalletConnect · NetworkMismatchBanner · NetworkBadge ...
│       │   │   ├── ui/         # Button · Input · Modal · Toast · Spinner · ThemeToggle ...
│       │   │   ├── layout/     # Header
│       │   │   └── common/     # RiskDisclaimer · EnvValidationBanner
│       │   ├── hooks/          # useWallet · useToken · useBondingCurve · useSoroban · usePolling ...
│       │   ├── lib/            # constants · soroban · env · format · ipfs · inputGuards
│       │   ├── styles/         # globals.css + design tokens
│       │   └── test/           # test setup
│       ├── tailwind.config.ts  · next.config.js · vitest.config.ts · tsconfig.json
│
├── contracts/                  # Rust / Soroban smart contracts (no_std, WASM)
│   ├── token/                  #   SEP-41 token contract
│   ├── factory/                #   Token registry / factory singleton
│   └── bonding-curve/          #   Exponential AMM (bonding curve)
│
├── packages/
│   └── sdk/                    # @forgex/sdk — TypeScript client library
│       └── src/
│           ├── ForgeXClient.ts # Top-level convenience client
│           ├── client.ts       # SorobanClient (RPC, simulate/invoke/sign)
│           ├── abi.ts          # ScVal encoders/decoders
│           ├── utils.ts        # XLM / token formatting helpers
│           ├── contracts/      # token.ts · factory.ts · bonding-curve.ts (typed clients)
│           └── types/          # token.ts · curve.ts · events.ts
│
├── scripts/                    # Shell orchestration
│   ├── initialize.sh           # First-time setup (deps, soroban CLI, .env)
│   ├── build-contracts.sh      # cargo build → wasm32v1-none WASM
│   ├── deploy-testnet.sh       # Deploy + initialize factory + curve, write .env.testnet
│   ├── deploy-mainnet.sh       # Future mainnet deployment
│   └── fund-testnet.sh         # Fund deployer account
│
├── docs/                       # 15 detailed docs (SDK API, deployment runbook, ADRs, ...)
├── .github/workflows/          # contracts-ci · frontend-ci · deploy-testnet
├── Cargo.toml                  # Rust workspace (3 contract crates)
├── package.json                # npm workspaces (apps/*, packages/*)
├── Architecture.md             # Full technical architecture + mainnet plan
├── .env.example                # Required environment variables
├── CONTRIBUTING.md
└── LICENSE                     # MIT OR Apache-2.0
```

---

## Smart Contracts

All three contracts are Rust `no_std` crates targeting Stellar **Soroban** (SDK `27.0.3`), compiled to `wasm32v1-none`. Release profile is tuned for WASM: `opt-level = "z"`, LTO, panic-abort, overflow-checks on.

### 1. Token Contract (SEP-41)

Full-featured Stellar token, hardened against common attacks.

| Entry point | Description |
|---|---|
| `__constructor(admin, name, symbol, decimals, max_supply)` | Runs once at deployment — **no public `initialize`**, so admin/metadata can never be re-set |
| `mint(to, amount)` | Mint tokens (admin + recipient authorized), respects `max_supply` |
| `burn(from, amount)` | Burn tokens (admin authorized) |
| `transfer(from, to, amount)` | SEP-41 transfer with pause + authorization checks |
| `transfer_from` / `approve` / `allowance` | SEP-41 approved-spender flow |
| `balance_of` / `total_supply` / `metadata` | Public reads |
| `paused` / `pause` / `unpause` | Emergency stop for all value-moving ops (admin) |
| `version()` | `InterfaceVersion { interface: 1, implementation: 3 }` |
| `upgrade(wasm_hash)` | Admin-gated implementation upgrade |

Storage model & safety: instance storage for metadata, P2PKH-pattern balances, revocable authorization. Structured `TokenError` results instead of panics on invalid input.

### 2. Factory Contract

A **singleton registry** that tracks every forged token on-chain.

| Entry point | Description |
|---|---|
| `initialize(admin)` | One-time admin setup (guarded by `AlreadyInitialized`) |
| `create_token(CreateTokenParams)` | Register a token+curve pair (admin only). Validates name/symbol length (1–32B), decimals (0–255), non-negative max supply, verifies `token_id` & `curve_id` **exist** on-chain, rejects duplicates. Emits `TokenCreated` |
| `set_admin / get_admin` | Ownership handover (new admin must exist; emits `AdminChanged`) |
| `get_all_tokens` / `get_token` / `get_token_count` | Registry reads |
| `get_by_name` / `get_by_symbol` / `has_token` / `has_name` / `has_symbol` | Lookups |
| `remove` / `paginated(offset, limit)` | Admin removal + pagination |

Data model — a stored `TokenInfo` record per token:

```
TokenInfo {
  token_id, curve_id, creator, name, symbol,
  decimals, max_supply, image_uri, description, created_at
}
```

### 3. Bonding Curve Contract

The market itself — an exponential AMM with production safety controls.

| Entry point | Description |
|---|---|
| `initialize(token_id, curve_params, admin)` | One-time curve setup |
| `buy(buyer, amount_out, max_cost, deadline)` | Buy `amount_out` tokens; pays `cost + fee` on top of reserve; enforces slippage `max_cost`, deadline, min/max buys, cap, and the **reentrancy guard** |
| `sell(seller, amount_in, min_payout, deadline)` | Sell `amount_in` tokens; pays out `payout − fee` from reserve; enforces slippage `min_payout`, deadline, min/max sells, and reentrancy guard |
| `get_price` / `get_buy_cost` / `get_sell_price` | Quote helpers (public reads) |
| `get_reserve` / `get_tokens_sold` / `get_market_cap` / `get_reserve_ratio` | Reserve-derived state |
| `get_curve_info()` | Full state snapshot `CurveInfo` (used by the frontend) |
| `set_fee_rate` (bp) / `set_buy_limits` / `set_sell_limits` / `set_cap` | Admin controls (emits events) |
| `withdraw_fees(recipient)` | Admin claims accumulated fees (accounting layer) |
| `is_graduated` | True once `cap` is reached |

Internal security: `enter()/exit()` **reentrancy guard** (`in_flight` flag), `require_auth()` on every trade and admin call, checked arithmetic (`panic` on overflow/underflow — tx fails closed).

### Contract Events

| Event | Emitted by | Topics → Data |
|---|---|---|
| `TokenCreated` | Factory | `(creator, token_id)` → full `TokenInfo` |
| `AdminChanged` | Factory | `(old_admin, new_admin)` → `()` |
| `Buy` | Bonding curve | `(buyer)` → `(buyer, amount_out, cost, fee, new_price, new_reserve, admin_fees)` |
| `Sell` | Bonding curve | `(seller)` → `(seller, amount_in, payout, fee, new_price, new_reserve, admin_fees)` |
| `WithdrawFees` | Bonding curve | `(admin)` → `(recipient, amount)` |
| `SetFeeRate` / `SetBuyLimits` / `SetSellLimits` / `SetCap` | Bonding curve | `(admin)` → new values |

---

## TypeScript SDK (`@forgex/sdk`)

A typed, framework-agnostic client for the ForgeX contracts.

```
@forgex/sdk
├── ForgeXClient        # One-stop: token(·) · factory(·) · bondingCurve(·) · createToken(·)
├── SorobanClient       # RPC plumbing: read() · invoke() · getLatestLedger()
│                        #   build ▸ simulate ▸ assemble auth ▸ sign ▸ submit ▸ poll
├── TokenClient         # typed token entry points (mint, transfer, approve, ...)
├── FactoryClient       # initialize · createToken · getAllTokens · getTokenCount · ...
├── BondingCurveClient  # buy · sell · getCurveInfo · getPrice · setFeeRate · ...
├── abi.ts              # ScVal <-> JS: i128, u32, u64, address, string, symbol, vec, bytes, ...
└── utils.ts            # formatXLM · parseXLM · formatTokenAmount · validateAddress · ...
```

Key design points:

- **Wallet-agnostic signing** — `TransactionSigner` is either a `Keypair` (bots/scripts) or a function that accepts an envelope XDR (Freighter-backed browser signing).
- **Typed options** — `InvokeOptions { sourceAccount, signers, timeoutSeconds }` and `ReadOptions`.
- **Structured results** — `InvokeResult { hash, status, retval, error }`.
- **Full ABI surface** — encodes/decodes every contract argument and return value.
- **Convenience layer** — `ForgeXClient.createToken()` bootstraps a token end-to-end.

---

## Frontend (`apps/web`)

Next.js 14 App Router frontend, styled with Tailwind + CSS-variable design tokens (light/dark via `ThemeToggle`).

### Routes

| Route | Purpose |
|---|---|
| `/` | **Token Feed** — search, sort (market cap / newest / price), paginated grid of tokens |
| `/create` | **Create Token** — validated form → `ForgeXClient.createToken()` |
| `/token/[id]` | **Token Detail** — stats, price chart, live buy/sell trade panel, recent trades |
| not-found / error | Custom 404 + error + global-error pages |

### Key components

```
src/components
├── tokens/    TokenFeed · TokenGrid · TokenCard · TokenCardSkeleton · TokenAvatar ·
│              CreateTokenForm · TokenDetailHeader · TokenStatsRow · RecentTrades
├── trade/     TradePanel · BuyForm · SellForm · SlippageTolerance · QuotePreview ·
│              PriceChart (lightweight-charts) · TransactionConfirmationModal
├── wallet/    WalletConnect (Freighter) · NetworkBadge · NetworkMismatchBanner · WalletErrorBanner
├── ui/        Button · Input · Modal · Spinner · PageLoader · ErrorView · EmptyState ·
│              Toast · ThemeToggle
├── layout/    Header (nav: Feed · Create · network selector)
└── common/    RiskDisclaimer · EnvValidationBanner
```

### State (`src/hooks`, zustand)

| Hook | Role |
|---|---|
| `useWallet` | Freighter connect/disconnect, address, balance, network + network-mismatch detection |
| `useToken` | Token feed data (fetch / retry / error) |
| `useBondingCurve` | Trade state: buy/sell amounts, slippage %, estimated cost/payout, refresh |
| `useSoroban` | Memoized `ForgeXClient` bound to the active network |
| `useTxState` / `usePolling` / `useToast` / `useTheme` | Transaction lifecycle, polling, toast UI, theming |

### Wallet & security

- **Freighter** only — no private keys ever touch the app; only the public address is held in state.
- **Network mismatch detection** — the app compares the wallet's passphrase to the selected network and refuses flows on mismatch.
- **Sanitized errors** — wallet errors are mapped to user-safe messages before display.
- **Env validation banner** — warns when contract IDs / RPC are not configured.

---

## Scripts

| Script | Purpose |
|---|---|
| `./scripts/initialize.sh` | Check Node/Rust, `npm install`, install soroban CLI, scaffold `.env.local` |
| `./scripts/build-contracts.sh` | Add `wasm32v1-none` target, `cargo build --release --target wasm32v1-none` for all 3 crates |
| `./scripts/deploy-testnet.sh` | Build → deploy Factory → `initialize` → deploy Bonding Curve → write IDs to `.env.testnet` |
| `./scripts/fund-testnet.sh` | Fund the deployer account with testnet XLM |
| `./scripts/deploy-mainnet.sh` | Placeholder for future mainnet deploy (requires audit + governance) |

---

## Quick Start

```bash
# 1. One-time setup (Node.js 18+, Rust, soroban CLI)
./scripts/initialize.sh

# 2. Build the Soroban contracts to WASM
./scripts/build-contracts.sh

# 3. Fund the deployer (first time) and deploy to Stellar Testnet
export SOROBAN_ACCOUNT=<deployer-secret-key>
./scripts/fund-testnet.sh
./scripts/deploy-testnet.sh

# 4. Point the frontend at the deployed contracts, then run it
cp .env.testnet .env.local            # add the NEXT_PUBLIC_FACTORY_CONTRACT_ID etc.
npm run dev:web                       # http://localhost:3000
```

### Monorepo commands

```bash
npx nx run ...            # not used — plain npm workspaces instead
npm run build:sdk         # build @forgex/sdk (tsc)
npm run build:web         # build web (auto-builds sdk first via prebuild)
npm run build             # both
npm run dev:web           # Next.js dev server
npm run lint              # next lint (apps/web)
npm run typecheck         # tsc --noEmit (apps/web)
npm test                  # vitest (apps/web)
```

---

## Configuration / Environment Variables

From `.env.example`. Frontend vars are `NEXT_PUBLIC_*` (inlined at build time by Next.js):

| Variable | Type | Description |
|---|---|---|
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | frontend | Soroban RPC endpoint (testnet by default) |
| `NEXT_PUBLIC_NETWORK_PASSPHRASE` | frontend | Network passphrase ("Test SDF Network ; September 2015") |
| `NEXT_PUBLIC_FACTORY_CONTRACT_ID` | frontend | Deployed factory contract ID |
| `NEXT_PUBLIC_BONDING_CURVE_CONTRACT_ID` | frontend | Deployed bonding curve contract ID |
| `NEXT_PUBLIC_IPFS_GATEWAY` | frontend | IPFS gateway for token image metadata |
| `SOROBAN_ACCOUNT` | scripts/CI | Deployer secret key (never in frontend) |
| `SOROBAN_RPC_URL` | scripts/CI | RPC used by deploy scripts |
| `SOROBAN_NETWORK_PASSPHRASE` | scripts/CI | Passphrase used by deploy scripts |

---

## Testing

| Layer | Tooling | Coverage |
|---|---|---|
| Contracts | Rust `#[test]` + Soroban test harness | token **48** · factory **29** · bonding-curve **31** unit tests |
| SDK | `vitest` (via SDK workspace) | ABI, formatting, client behavior |
| Frontend | `vitest` + Testing Library + jsdom | **35** test files across components, hooks, app pages, and lib |

```bash
npm run test              # frontend tests
cargo test --lib -p forgex-token -p forgex-factory -p forgex-bonding-curve   # contract tests
npm test -w packages/sdk  # SDK tests
```

---

## CI / CD

GitHub Actions workflows in `.github/workflows/`:

| Workflow | Triggers | Checks |
|---|---|---|
| `contracts-ci.yml` | push/PR touching `contracts/**` | `cargo build` · `cargo test` · `clippy -D warnings` · `cargo fmt --check` |
| `frontend-ci.yml` | push/PR touching `apps/web/**` or `packages/sdk/**` | `npm ci` · SDK typecheck · `npm run lint` · `npm run build` (SDK built first) |
| `deploy-testnet.yml` | manual `workflow_dispatch` on `main` | Build WASM → `./scripts/deploy-testnet.sh` with `SOROBAN_ACCOUNT` etc. from secrets |

---

## Documentation

See `docs/` for deep dives (all current, expanded beyond this README):

| Doc | Covers |
|---|---|
| `ADR_INDEX.md` | 13 architecture decision records (language, math, governance, deployment...) |
| `SDK_API_REFERENCE.md` | Full SDK classes, methods, and usage examples |
| `BONDING_CURVE.md` | Curve math, fixed-point, Taylor approximation |
| `SMART_CONTRACTS.md` | Contract-by-contract behavior |
| `DEPLOYMENT.md` / `DEPLOYMENT_RUNBOOK.md` | Testnet/mainnet procedures, verification & rollback |
| `ENVIRONMENT_SETUP.md` | Contributor onboarding, config, troubleshooting |
| `MONITORING_ALERTING.md` | Metrics, alerts, dashboards |
| `THEMING_DESIGN_TOKENS.md` | CSS variables, Tailwind config, dark mode |
| `SECURITY_POLICY.md` / `LICENSE_COMPLIANCE.md` | Audit checklist, SBOM, vulnerability response |
| `QUICK_REFERENCE.md` | Commands, SDK patterns, env vars, troubleshooting |
| `Architecture.md` (root) | Full protocol architecture + mainnet requirements |

---

## Roadmap

| Phase | Status |
|---|---|
| 1. Smart Contract Foundation | ✅ Done |
| 2. Token Contract (SEP-41) | ✅ Done |
| 3. Factory Contract | ✅ Done |
| 4. Bonding Curve AMM | ✅ Done |
| 5. SDK Package (`@forgex/sdk`) | ✅ Done |
| 6. Frontend Scaffold | ✅ Done |
| 7. Token Creation Flow | ✅ Done — wired to `ForgeXClient.createToken` (testnet) |
| 8. Trading Flow (buy/sell) | 🚧 In progress — UI complete; on-chain wiring for simulated fallback |
| 9. Token Feed & Polish | 🚧 In progress — live feed from Factory on deploy |
| 10. Testnet Launch | ✅ Contracts deployed & initialized (factory + curve + `FDEMO` token) · frontend live at **https://forgex.pxxl.click**; full end-to-end on-chain flow next |

### Mainnet gate (Security, per Architecture.md)

1. Formal smart-contract security audit
2. Community review + launch checklist sign-off
3. Multi-sig / governance admin setup
4. Monitoring + alerting live (see `docs/MONITORING_ALERTING.md`)

---

## License

**MIT OR Apache-2.0** — dual-licensed, see [`LICENSE`](./LICENSE). Contributions welcome — see [`CONTRIBUTING.md`](./CONTRIBUTING.md).