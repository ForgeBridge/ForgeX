Here's the full `ARCHITECTURE.md` for ForgeX:

---

```markdown
# ForgeX — Architecture Document

> **Version:** 1.0.0
> **Last Updated:** July 24, 2026
> **Status:** MVP — Phase 1
> **Network:** Stellar Testnet (mainnet post-audit)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Repository Structure](#3-repository-structure)
4. [Smart Contract Architecture](#4-smart-contract-architecture)
5. [Bonding Curve Mathematics](#5-bonding-curve-mathematics)
6. [Frontend Architecture](#6-frontend-architecture)
7. [SDK / Shared Package](#7-sdk--shared-package)
8. [Infrastructure & Deployment](#8-infrastructure--deployment)
9. [Data Flow Diagrams](#9-data-flow-diagrams)
10. [Security Considerations](#10-security-considerations)
11. [Development Phases](#11-development-phases)
12. [Tech Stack Summary](#12-tech-stack-summary)
13. [Glossary](#13-glossary)

---

## 1. Project Overview

### 1.1 What is ForgeX?

ForgeX is an open-source token launchpad on the **Stellar blockchain** powered by
**Soroban smart contracts**. It allows any user — developer or non-developer — to
create, trade, and discover tokens through an **exponential bonding curve AMM**,
requiring zero upfront liquidity.

### 1.2 Core Value Proposition

- **Instant token creation** — launch a token in under 30 seconds
- **Zero initial liquidity** — the bonding curve acts as the market maker
- **Low-cost trading** — Stellar's sub-cent transaction fees enable micro-trading
- **Permissionless** — anyone can create or trade tokens
- **Open source** — fully transparent, community-driven development

### 1.3 Target Users

| User Type | Use Case |
|---|---|
| Token creators / projects | Launch community tokens, memecoins, utility tokens |
| Traders / speculators | Buy low on the curve, sell high, discover trending tokens |
| Non-developers | Create and trade tokens with zero technical knowledge |
| Blockchain explorers | Browse, discover, and analyze newly launched tokens |
| Developers / contributors | Extend the platform, build tooling, contribute to open source |

### 1.4 MVP Scope

**In Scope (v1):**
- Token creation (name, symbol, decimals, max supply, image, description)
- Exponential bonding curve AMM (buy / sell with XLM)
- Token discovery feed (trending, newest, top by market cap)
- Freighter wallet integration
- Basic trading UI with price chart
- Testnet deployment

**Out of Scope (v2+):**
- Graduation mechanism (migrate to DEX at market cap threshold)
- Multi-currency pairs (USDC, custom tokens)
- Social features (comments, profiles, leaderboards)
- Admin dashboard / analytics
- Mainnet deployment
- Mobile application

---

## 2. System Architecture

### 2.1 High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER LAYER                               │
│                                                                 │
│   ┌──────────┐   ┌──────────────┐   ┌───────────────────────┐  │
│   │ Freighter │   │  Browser /   │   │   Mobile Browser      │  │
│   │  Wallet   │   │  Desktop     │   │   (responsive)        │  │
│   └─────┬────┘   └──────┬───────┘   └───────────┬───────────┘  │
│         │               │                       │               │
└─────────┼───────────────┼───────────────────────┼───────────────┘
          │               │                       │
          ▼               ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND LAYER                              │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              Next.js Application (React)                 │   │
│   │                                                         │   │
│   │  ┌───────────┐ ┌───────────┐ ┌──────────┐ ┌─────────┐  │   │
│   │  │  Token    │ │  Trading  │ │  Token   │ │ Wallet  │  │   │
│   │  │  Create   │ │  Panel    │ │  Feed    │ │ Connect │  │   │
│   │  └───────────┘ └───────────┘ └──────────┘ └─────────┘  │   │
│   └────────────────────────┬────────────────────────────────┘   │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SDK LAYER                                 │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              @forgex/sdk (TypeScript)                    │   │
│   │                                                         │   │
│   │  ┌────────────┐ ┌────────────┐ ┌─────────────────────┐  │   │
│   │  │ Contract   │ │  Type      │ │  Soroban RPC        │  │   │
│   │  │ ABIs / IDs │ │  Defs      │ │  Client Wrapper     │  │   │
│   │  └────────────┘ └────────────┘ └─────────────────────┘  │   │
│   └────────────────────────┬────────────────────────────────┘   │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BLOCKCHAIN LAYER                             │
│                  (Stellar / Soroban)                            │
│                                                                 │
│   ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐   │
│   │   Token      │ │   Factory    │ │   Bonding Curve      │   │
│   │   Contract   │ │   Contract   │ │   AMM Contract       │   │
│   │  (per token) │ │  (registry)  │ │  (per token pool)    │   │
│   └──────────────┘ └──────────────┘ └──────────────────────┘   │
│                                                                 │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │              Stellar Network (Testnet → Mainnet)         │  │
│   │              Soroban Runtime (WASM)                      │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STORAGE / INDEXING                           │
│                                                                 │
│   ┌────────────┐  ┌────────────┐  ┌─────────────────────────┐  │
│   │  IPFS /    │  │  Soroban   │  │  Horizon API            │  │
│   │  Arweave   │  │  RPC       │  │  (tx history, events)   │  │
│   │ (metadata) │  │  (state)   │  │                         │  │
│   └────────────┘  └────────────┘  └─────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Interaction Summary

```
User → Freighter Wallet → Next.js Frontend → @forgex/sdk → Soroban RPC
                                                                    │
                                              ┌─────────────────────┤
                                              ▼                     ▼
                                        Factory Contract    Bonding Curve
                                              │              Contract
                                              ▼                     │
                                        Token Contract ◄────────────┘
                                        (mint / burn)
```

---

## 3. Repository Structure

ForgeX uses a **monorepo** managed with **npm workspaces** (JS/TS) and
**Cargo workspaces** (Rust/Soroban).

```
forgex/
│
├── ARCHITECTURE.md              # This document
├── README.md                    # Project overview, quickstart
├── CONTRIBUTING.md              # Contribution guidelines
├── LICENSE                      # Open source license (MIT / Apache 2.0)
├── package.json                 # Root: npm workspaces config
├── Cargo.toml                   # Root: Rust workspace config
├── .gitignore
├── .github/
│   └── workflows/
│       ├── contracts-ci.yml     # Rust build + test + clippy
│       ├── frontend-ci.yml      # Next.js lint + build + test
│       └── deploy-testnet.yml   # Auto-deploy to testnet
│
├── contracts/                   # ── Rust / Soroban Smart Contracts ──
│   ├── Cargo.toml               # Workspace members
│   ├── token/                   # Token contract (SEP-41 compatible)
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── token.rs
│   │       ├── metadata.rs
│   │       └── test.rs
│   ├── factory/                 # Token factory + registry
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── factory.rs
│   │       ├── registry.rs
│   │       └── test.rs
│   └── bonding-curve/           # Exponential AMM
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs
│           ├── curve.rs
│           ├── pool.rs
│           ├── math.rs
│           └── test.rs
│
├── packages/                    # ── Shared TypeScript Packages ──
│   └── sdk/                     # @forgex/sdk
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── contracts/       # Contract IDs, ABIs, wrappers
│           │   ├── factory.ts
│           │   ├── bonding-curve.ts
│           │   └── token.ts
│           ├── types/           # Shared TypeScript types
│           │   ├── token.ts
│           │   ├── curve.ts
│           │   └── events.ts
│           ├── client.ts        # Soroban RPC client wrapper
│           └── utils.ts         # Helpers (format, parse, validate)
│
├── apps/                        # ── Applications ──
│   └── web/                     # Next.js frontend
│       ├── package.json
│       ├── next.config.js
│       ├── tsconfig.json
│       ├── tailwind.config.ts
│       ├── public/
│       │   └── assets/          # Static images, icons
│       └── src/
│           ├── app/             # Next.js App Router
│           │   ├── layout.tsx
│           │   ├── page.tsx     # Home: token feed
│           │   ├── create/
│           │   │   └── page.tsx # Token creation
│           │   └── token/
│           │       └── [id]/
│           │           └── page.tsx  # Trading page
│           ├── components/
│           │   ├── layout/
│           │   │   ├── Header.tsx
│           │   │   ├── Footer.tsx
│           │   │   └── Sidebar.tsx
│           │   ├── wallet/
│           │   │   └── WalletConnect.tsx
│           │   ├── trade/
│           │   │   ├── TradePanel.tsx
│           │   │   ├── BuyForm.tsx
│           │   │   ├── SellForm.tsx
│           │   │   └── PriceChart.tsx
│           │   ├── tokens/
│           │   │   ├── TokenCard.tsx
│           │   │   ├── TokenFeed.tsx
│           │   │   ├── TokenGrid.tsx
│           │   │   └── CreateTokenForm.tsx
│           │   └── ui/          # Reusable UI primitives
│           │       ├── Button.tsx
│           │       ├── Input.tsx
│           │       ├── Modal.tsx
│           │       └── Toast.tsx
│           ├── hooks/
│           │   ├── useWallet.ts
│           │   ├── useSoroban.ts
│           │   ├── useToken.ts
│           │   └── useBondingCurve.ts
│           ├── lib/
│           │   ├── soroban.ts   # RPC config
│           │   ├── constants.ts # Contract IDs, network config
│           │   └── format.ts    # Display formatting
│           └── styles/
│               └── globals.css
│
├── scripts/                     # ── Build & Deploy Scripts ──
│   ├── build-contracts.sh       # Build all WASM contracts
│   ├── deploy-testnet.sh        # Deploy to Stellar testnet
│   ├── deploy-mainnet.sh        # Deploy to mainnet (v2)
│   ├── initialize.sh            # First-time setup
│   └── fund-testnet.sh          # Fund testnet accounts via friendbot
│
└── docs/                        # ── Documentation ──
    ├── CONTRIBUTING.md
    ├── SMART_CONTRACTS.md       # Contract API reference
    ├── BONDING_CURVE.md         # Curve math deep-dive
    ├── DEPLOYMENT.md            # Deployment guide
    └── SECURITY.md              # Security model & audit notes
```

---

## 4. Smart Contract Architecture

All contracts are written in **Rust**, compiled to **WASM**, and deployed on the
**Soroban runtime**.

### 4.1 Contract Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FACTORY CONTRACT                         │
│                   (Singleton / Registry)                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  create_token(name, symbol, decimals, max_supply,   │    │
│  │              image_uri, description, curve_params)   │    │
│  │                                                     │    │
│  │  → Deploys Token Contract                           │    │
│  │  → Initializes Bonding Curve Pool                   │    │
│  │  → Registers token in registry                      │    │
│  │  → Emits TokenCreated event                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  get_all_tokens() → Vec<TokenInfo>                  │    │
│  │  get_token(id) → TokenInfo                          │    │
│  │  get_token_count() → u64                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Storage: Persistent (registry), Instance (config)          │
└─────────────────────────────────────────────────────────────┘
         │ creates                    │ initializes
         ▼                           ▼
┌──────────────────┐    ┌──────────────────────────────────┐
│  TOKEN CONTRACT  │    │     BONDING CURVE CONTRACT       │
│  (Per Token)     │    │     (Per Token Pool)             │
│                  │    │                                  │
│  SEP-41 compat:  │    │  ┌────────────────────────────┐  │
│  - transfer()    │    │  │  Exponential Curve:        │  │
│  - balance_of()  │◄───│  │  P(S) = P₀ × e^(k × S)   │  │
│  - approve()     │    │  │                            │  │
│  - allowance()   │    │  │  buy(amount_out)           │  │
│  - mint()  🔒    │    │  │  sell(amount_in)           │  │
│  - burn()  🔒    │    │  │  get_price()               │  │
│  - metadata()    │    │  │  get_reserve()             │  │
│                  │    │  │  get_market_cap()          │  │
│  🔒 = factory    │    │  └────────────────────────────┘  │
│  / curve only    │    │                                  │
│                  │    │  Storage: Persistent (reserves,  │
│  Storage:        │    │  curve state), Instance (params) │
│  Persistent      │    │                                  │
│  (balances,      │    └──────────────────────────────────┘
│  allowances)     │
└──────────────────┘
```

### 4.2 Token Contract

**Purpose:** Represents a single forgeable token on ForgeX.

| Function | Access | Description |
|---|---|---|
| `initialize(admin, name, symbol, decimals, max_supply)` | Once | Set token metadata and admin |
| `mint(to, amount)` | Admin only | Mint new tokens (called by bonding curve on buy) |
| `burn(from, amount)` | Admin only | Burn tokens (called by bonding curve on sell) |
| `transfer(from, to, amount)` | Token holder | Transfer tokens between accounts |
| `balance_of(id) → i128` | Public | Query token balance |
| `approve(from, spender, amount, expiration)` | Token holder | Approve spending allowance |
| `allowance(from, spender) → i128` | Public | Query allowance |
| `metadata() → TokenMetadata` | Public | Return name, symbol, decimals, supply |

**Storage Strategy:**
- **Persistent:** Balances map, allowances map, total supply
- **Instance:** Token metadata (name, symbol, decimals, max_supply, admin)
- **Temporary:** None

**Events Emitted:**
- `Transfer { from, to, amount }`
- `Mint { to, amount }`
- `Burn { from, amount }`
- `Approval { from, spender, amount }`

### 4.3 Factory Contract

**Purpose:** Singleton registry that creates and tracks all ForgeX tokens.

| Function | Access | Description |
|---|---|---|
| `initialize(admin)` | Once | Set factory admin |
| `create_token(params) → (token_id, curve_id)` | Public | Deploy token + curve, register |
| `get_all_tokens() → Vec<TokenInfo>` | Public | List all created tokens |
| `get_token(token_id) → TokenInfo` | Public | Get single token info |
| `get_token_count() → u64` | Public | Total tokens created |
| `get_tokens_paginated(offset, limit) → Vec<TokenInfo>` | Public | Paginated listing |

**`create_token` Parameters:**

```rust
struct CreateTokenParams {
    name: String,           // "ForgeX Doge"
    symbol: String,         // "FDOGE"
    decimals: u32,          // 7 (Stellar standard)
    max_supply: i128,       // 1_000_000_000 × 10^7
    image_uri: String,      // "ipfs://Qm..."
    description: String,    // "The goodest boy on Stellar"
    curve_params: CurveParams,
}

struct CurveParams {
    initial_price: i128,    // P₀ in stroops (e.g., 100 = 0.00001 XLM)
    steepness: i128,        // k factor (scaled by 10^7 for precision)
    reserve_target: i128,   // XLM target for graduation (v2)
}
```

**Storage Strategy:**
- **Persistent:** Token registry (Vec<TokenInfo>), token count
- **Instance:** Admin address, factory config

**Events Emitted:**
- `TokenCreated { token_id, curve_id, creator, name, symbol, timestamp }`

### 4.4 Bonding Curve Contract

**Purpose:** AMM pool that manages buy/sell along an exponential curve for a single token.

| Function | Access | Description |
|---|---|---|
| `initialize(token_id, curve_params, admin)` | Once | Set curve parameters |
| `buy(buyer, amount_out) → cost` | Public | Buy tokens, pay XLM |
| `sell(seller, amount_in) → payout` | Public | Sell tokens, receive XLM |
| `get_price() → i128` | Public | Current price per token |
| `get_reserve() → i128` | Public | XLM in the pool |
| `get_tokens_sold() → i128` | Public | Total tokens sold on curve |
| `get_market_cap() → i128` | Public | Current market cap |
| `get_curve_info() → CurveInfo` | Public | Full curve state |

**Storage Strategy:**
- **Persistent:** XLM reserve balance, tokens sold, curve state
- **Instance:** Curve parameters (P₀, k, token_id, admin)
- **Temporary:** None

**Events Emitted:**
- `Buy { buyer, amount_out, cost, new_price, new_reserve }`
- `Sell { seller, amount_in, payout, new_price, new_reserve }`

---

## 5. Bonding Curve Mathematics

### 5.1 Exponential Bonding Curve

ForgeX uses an **exponential bonding curve** to determine token price as a
function of supply sold.

**Price Function:**

```
P(S) = P₀ × e^(k × S)
```

Where:
- `P(S)` = price per token at supply `S`
- `P₀` = initial price (in stroops, 1 XLM = 10⁷ stroops)
- `k` = steepness factor (controls how fast price rises)
- `S` = number of tokens sold so far
- `e` = Euler's number (≈ 2.71828)

### 5.2 Cost to Buy

The cost to buy tokens from supply `S₁` to `S₂` is the integral of the price
function:

```
Cost(S₁ → S₂) = ∫[S₁ to S₂] P₀ × e^(k × S) dS

              = (P₀ / k) × (e^(k × S₂) - e^(k × S₁))
```

### 5.3 Payout on Sell

The payout for selling tokens from supply `S₂` back to `S₁`:

```
Payout(S₂ → S₁) = (P₀ / k) × (e^(k × S₂) - e^(k × S₁))
```

This is symmetric with the buy cost — the curve is reversible.

### 5.4 Fixed-Point Arithmetic

Soroban does not support floating-point math. All calculations use **fixed-point
arithmetic** scaled by `10^7` (matching Stellar's 7 decimal places).

```
SCALE = 10^7

P₀ stored as:     initial_price × SCALE
k stored as:      steepness × SCALE
e^(k×S) computed via: Taylor series approximation (10-15 terms)
Division:         (a × SCALE) / b
```

### 5.5 Example Parameters

| Parameter | Value | Meaning |
|---|---|---|
| `P₀` | 100 stroops | Initial price = 0.00001 XLM |
| `k` | 0.0000001 | Gentle exponential rise |
| `max_supply` | 1,000,000,000 × 10⁷ | 1 billion tokens |
| `reserve_target` | 500,000 × 10⁷ | 500K XLM for graduation (v2) |

### 5.6 Curve Behavior

```
Price
  ▲
  │                                          ╱
  │                                        ╱
  │                                     ╱
  │                                  ╱
  │                             ╱╱╱
  │                       ╱╱╱
  │                 ╱╱╱
  │           ╱╱╱
  │     ╱╱╱╱
  │╱╱╱
  └──────────────────────────────────────────► Tokens Sold
  0        250M      500M      750M      1B
```

Early buyers get exponentially cheaper prices. Late buyers pay exponentially
more. This creates natural price discovery and early-adopter incentive.

---

## 6. Frontend Architecture

### 6.1 Framework & Stack

| Technology | Purpose |
|---|---|
| **Next.js 14+** (App Router) | React framework, SSR, routing |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Styling |
| **@stellar/stellar-sdk** | Stellar network interaction |
| **@stellar/freighter-api** | Wallet integration |
| **@forgex/sdk** | Shared contract types & helpers |
| **Lightweight Charts** (TradingView) | Price charting |
| **Zustand** | State management |

### 6.2 Page Structure

```
/                    → Token Feed (trending, newest, top market cap)
/create              → Create a new token
/token/[id]          → Token detail + trading page
```

### 6.3 Component Hierarchy

```
App
├── Header
│   ├── Logo
│   ├── NavLinks (Feed, Create)
│   └── WalletConnect
│
├── Pages
│   ├── TokenFeed
│   │   ├── FilterTabs (Trending | Newest | Top)
│   │   ├── SearchBar
│   │   └── TokenGrid
│   │       └── TokenCard (×N)
│   │           ├── TokenImage
│   │           ├── TokenName / Symbol
│   │           ├── MarketCap
│   │           ├── PriceChange
│   │           └── CreatedBy / TimeAgo
│   │
│   ├── CreateToken
│   │   └── CreateTokenForm
│   │       ├── NameInput
│   │       ├── SymbolInput
│   │       ├── SupplyInput
│   │       ├── ImageUpload → IPFS
│   │       ├── DescriptionInput
│   │       ├── CurveParamsPreview
│   │       └── SubmitButton → Factory.create_token()
│   │
│   └── TokenDetail
│       ├── TokenHeader (image, name, symbol, market cap)
│       ├── PriceChart (TradingView lightweight-charts)
│       ├── TradePanel
│       │   ├── BuyForm (XLM → Token)
│       │   ├── SellForm (Token → XLM)
│       │   └── SlippageSelector
│       ├── TokenInfo (supply, reserve, curve params)
│       └── TransactionHistory
│
└── Footer
```

### 6.4 State Management

```
Zustand Stores:

useWalletStore
├── address: string | null
├── isConnected: boolean
├── connect(): void
├── disconnect(): void
└── signTransaction(xdr): Promise<string>

useTokenStore
├── tokens: TokenInfo[]
├── selectedToken: TokenInfo | null
├── loading: boolean
├── fetchTokens(): void
└── fetchToken(id): void

useTradeStore
├── buyAmount: string
├── sellAmount: string
├── slippage: number
├── estimatedCost: string
├── estimatedPayout: string
├── executeBuy(): void
└── executeSell(): void
```

### 6.5 Wallet Integration

```
Freighter Wallet Flow:

1. User clicks "Connect Wallet"
2. Frontend calls freighter-api → request public key
3. User approves in Freighter extension
4. Public key stored in useWalletStore
5. For transactions:
   a. Frontend builds Soroban transaction via @forgex/sdk
   b. Transaction XDR sent to Freighter for signing
   c. Signed XDR submitted to Soroban RPC
   d. Poll for transaction confirmation
   e. Update UI state
```

---

## 7. SDK / Shared Package

### 7.1 Purpose

`@forgex/sdk` is the shared TypeScript package that provides:

- **Contract wrappers** — typed functions for every contract method
- **Type definitions** — shared interfaces for tokens, curves, events
- **RPC client** — configured Soroban RPC client
- **Utilities** — formatting, parsing, validation helpers

### 7.2 Module Structure

```typescript
// @forgex/sdk exports

// Contract wrappers
export { FactoryClient } from './contracts/factory'
export { BondingCurveClient } from './contracts/bonding-curve'
export { TokenClient } from './contracts/token'

// Types
export type { TokenInfo, CreateTokenParams } from './types/token'
export type { CurveParams, CurveInfo, CurveState } from './types/curve'
export type { ForgeXEvent, BuyEvent, SellEvent } from './types/events'

// Client
export { ForgeXClient } from './client'

// Utils
export { formatXLM, parseXLM, formatTokenAmount } from './utils'
```

### 7.3 Usage Example

```typescript
import { ForgeXClient } from '@forgex/sdk'

const client = new ForgeXClient({
  network: 'testnet',
  rpcUrl: 'https://soroban-testnet.stellar.org',
})

// Create a token
const { token_id, curve_id } = await client.factory.createToken({
  name: 'ForgeX Doge',
  symbol: 'FDOGE',
  decimals: 7,
  max_supply: 1_000_000_000n * 10_000_000n,
  image_uri: 'ipfs://Qm...',
  description: 'The goodest boy on Stellar',
  curve_params: {
    initial_price: 100n,
    steepness: 1n,
    reserve_target: 500_000n * 10_000_000n,
  },
})

// Buy tokens
const cost = await client.bondingCurve.buy(curve_id, amountOut)

// Get current price
const price = await client.bondingCurve.getPrice(curve_id)
```

---

## 8. Infrastructure & Deployment

### 8.1 Network Configuration

| Environment | RPC URL | Network Passphrase |
|---|---|---|
| **Testnet** | `https://soroban-testnet.stellar.org` | `Test SDF Network ; September 2015` |
| **Mainnet** (v2) | `https://soroban.stellar.org` | `Public Global Stellar Network ; September 2015` |

### 8.2 Deployment Pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Build WASM  │────►│  Deploy to   │────►│  Update SDK  │
│  contracts   │     │  Testnet     │     │  contract IDs│
│  (cargo)     │     │  (soroban)   │     │  + Frontend  │
└──────────────┘     └──────────────┘     └──────────────┘
                                                │
                                                ▼
                                         ┌──────────────┐
                                         │  Deploy      │
                                         │  Frontend    │
                                         │  (Vercel)    │
                                         └──────────────┘
```

### 8.3 Storage Services

| Service | Purpose | MVP Choice |
|---|---|---|
| Token metadata / images | Store token images & descriptions | **IPFS** via Pinata |
| Contract state | On-chain state (balances, reserves) | **Soroban storage** |
| Transaction history | Query past transactions | **Horizon API** |
| Frontend hosting | Serve the web app | **Vercel** |
| CI/CD | Automated testing & deployment | **GitHub Actions** |

### 8.4 Environment Variables

```env
# .env.local (frontend)
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
NEXT_PUBLIC_FACTORY_CONTRACT_ID=C...
NEXT_PUBLIC_BONDING_CURVE_CONTRACT_ID=C...
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud

# .env (scripts)
SOROBAN_ACCOUNT=S...          # Deployer secret key
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
```

---

## 9. Data Flow Diagrams

### 9.1 Token Creation Flow

```
User fills form
       │
       ▼
Upload image to IPFS → get image_uri
       │
       ▼
Frontend calls SDK: factory.createToken(params)
       │
       ▼
SDK builds Soroban transaction
       │
       ▼
Freighter signs transaction
       │
       ▼
Transaction submitted to Soroban RPC
       │
       ▼
Factory Contract executes:
  ├── Deploy Token Contract (WASM)
  ├── Initialize token (name, symbol, supply)
  ├── Deploy Bonding Curve Contract
  ├── Initialize curve (P₀, k, reserve_target)
  ├── Register token in registry
  └── Emit TokenCreated event
       │
       ▼
Frontend receives token_id + curve_id
       │
       ▼
Redirect to /token/[id] trading page
```

### 9.2 Buy Flow

```
User enters XLM amount → clicks "Buy"
       │
       ▼
Frontend calls SDK: bondingCurve.buy(curve_id, amount_out)
       │
       ▼
SDK calculates cost via curve math
       │
       ▼
Build transaction:
  ├── Invoke bonding_curve.buy()
  ├── Transfer XLM to curve pool
  └── bonding_curve calls token.mint(buyer, amount)
       │
       ▼
Freighter signs → Submit to RPC
       │
       ▼
Bonding Curve Contract executes:
  ├── Verify XLM received
  ├── Update reserve: reserve += cost
  ├── Update tokens_sold: sold += amount_out
  ├── Call token.mint(buyer, amount_out)
  └── Emit Buy event
       │
       ▼
Frontend updates UI (balance, price, chart)
```

### 9.3 Sell Flow

```
User enters token amount → clicks "Sell"
       │
       ▼
Frontend calls SDK: bondingCurve.sell(curve_id, amount_in)
       │
       ▼
SDK calculates payout via curve math
       │
       ▼
Build transaction:
  ├── Invoke bonding_curve.sell()
  ├── Transfer tokens to curve (or burn)
  └── bonding_curve sends XLM to seller
       │
       ▼
Freighter signs → Submit to RPC
       │
       ▼
Bonding Curve Contract executes:
  ├── Call token.burn(seller, amount_in)
  ├── Update reserve: reserve -= payout
  ├── Update tokens_sold: sold -= amount_in
  ├── Transfer XLM to seller
  └── Emit Sell event
       │
       ▼
Frontend updates UI
```

---

## 10. Security Considerations

### 10.1 Smart Contract Security

| Concern | Mitigation |
|---|---|
| **Reentrancy** | Soroban's execution model prevents reentrancy by default |
| **Integer overflow** | Rust's checked arithmetic; use `i128` with explicit checks |
| **Access control** | `mint()` / `burn()` restricted to factory/curve admin |
| **Curve manipulation** | Parameters immutable after initialization |
| **Front-running** | Stellar's transaction ordering is deterministic per ledger; slippage protection on UI |
| **Storage exhaustion** | Bounded registry; pagination for token listing |
| **WASM size limits** | Keep contracts under Soroban's WASM size limit |

### 10.2 Frontend Security

| Concern | Mitigation |
|---|---|
| **Private key exposure** | Never handle secret keys; all signing via Freighter |
| **XSS** | React's built-in escaping; sanitize user inputs (token names, descriptions) |
| **IPFS content** | Validate image types; serve via gateway with CSP headers |
| **Contract ID integrity** | Hardcode verified contract IDs; no user-supplied contract addresses |

### 10.3 General

- All contracts unit-tested with `soroban test`
- Fuzz testing for curve math edge cases
- Testnet deployment and manual QA before any mainnet consideration
- Open-source code enables community audit
- Formal audit planned before mainnet launch (v2)

---

## 11. Development Phases

### Phase 1 — Smart Contract Foundation
- [ ] Scaffold Rust workspace
- [ ] Implement Token Contract (SEP-41 compatible)
- [ ] Implement Factory Contract (registry + creation)
- [ ] Unit tests for both contracts
- [ ] Deploy to Soroban Testnet

### Phase 2 — Bonding Curve AMM
- [ ] Implement exponential curve math (fixed-point)
- [ ] Implement Bonding Curve Contract (buy / sell / query)
- [ ] Integration tests (factory → curve → token)
- [ ] Deploy to Testnet

### Phase 3 — SDK Package
- [ ] Generate contract ABIs / bindings
- [ ] Build typed contract wrappers
- [ ] Define shared TypeScript types
- [ ] RPC client wrapper
- [ ] Unit tests

### Phase 4 — Frontend Scaffold
- [ ] Next.js project setup (App Router, Tailwind)
- [ ] Freighter wallet integration
- [ ] Layout components (Header, Footer, Nav)
- [ ] Routing structure

### Phase 5 — Token Creation Flow
- [ ] CreateTokenForm component
- [ ] IPFS image upload
- [ ] SDK integration → factory.createToken()
- [ ] Success redirect to token page

### Phase 6 — Trading Flow
- [ ] TradePanel (Buy / Sell forms)
- [ ] PriceChart (lightweight-charts)
- [ ] SDK integration → bondingCurve.buy() / sell()
- [ ] Real-time price updates
- [ ] Slippage protection UI

### Phase 7 — Token Feed & Polish
- [ ] TokenFeed with filtering (trending, newest, top)
- [ ] TokenCard component
- [ ] Search functionality
- [ ] Responsive design
- [ ] Loading states, error handling, toasts
- [ ] README, CONTRIBUTING, docs

### Phase 8 — Testnet Launch
- [ ] End-to-end testing
- [ ] Deploy all contracts to Testnet
- [ ] Deploy frontend to Vercel
- [ ] Community testing / feedback
- [ ] Bug fixes

### v2 Roadmap (Post-MVP)
- [ ] Graduation mechanism (bonding curve → DEX migration)
- [ ] Multi-currency pairs (USDC)
- [ ] Social features (comments, profiles)
- [ ] Admin dashboard / analytics
- [ ] Mainnet deployment
- [ ] Formal security audit
- [ ] Mobile optimization / PWA

---

## 12. Tech Stack Summary

| Layer | Technology |
|---|---|
| **Smart Contracts** | Rust, Soroban SDK, WASM |
| **Blockchain** | Stellar (Testnet → Mainnet) |
| **Frontend** | Next.js 14+, React 18+, TypeScript |
| **Styling** | Tailwind CSS |
| **State Management** | Zustand |
| **Wallet** | Freighter (@stellar/freighter-api) |
| **Stellar SDK** | @stellar/stellar-sdk, @stellar/soroban-client |
| **Charts** | TradingView Lightweight Charts |
| **Metadata Storage** | IPFS (Pinata) |
| **Frontend Hosting** | Vercel |
| **CI/CD** | GitHub Actions |
| **Package Manager** | npm (workspaces) |
| **Rust Build** | Cargo (workspace) |
| **Testing (Rust)** | soroban test, cargo test |
| **Testing (TS)** | Vitest / Jest |
| **Linting** | ESLint, Prettier, cargo clippy, cargo fmt |

---

## 13. Glossary

| Term | Definition |
|---|---|
| **Soroban** | Stellar's smart contract platform (Rust → WASM) |
| **SAC** | Stellar Asset Contract — native token standard on Soroban |
| **SEP-41** | Stellar Ecosystem Proposal for token interface on Soroban |
| **Bonding Curve** | Mathematical curve that determines token price based on supply |
| **AMM** | Automated Market Maker — algorithmic pricing without order books |
| **Stroop** | Smallest unit of XLM (1 XLM = 10,000,000 stroops) |
| **Freighter** | Browser extension wallet for Stellar |
| **Horizon** | Stellar's REST API for querying network state |
| **IPFS** | InterPlanetary File System — decentralized file storage |
| **WASM** | WebAssembly — binary format for Soroban contracts |
| **Graduation** | When a token's market cap hits a threshold and migrates to a DEX |
| **Fixed-point arithmetic** | Integer math scaled by a factor to simulate decimals |
| **Slippage** | Difference between expected and executed price |

---

*ForgeX — Forge your token. Trade on the curve. Built on Stellar.*

*This document is a living artifact. Update it as the architecture evolves.*
```

---
