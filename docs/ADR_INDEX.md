# Architecture Decision Records (ADRs)

This directory records significant architectural decisions for ForgeX.

---

## ADR Template

```markdown
# ADR-XXX: Title

**Status**: Proposed | Accepted | Superseded | Deprecated
**Date**: YYYY-MM-DD
**Authors**: Name

## Context
What is the issue that motivates this decision?

## Decision
What is the change we're proposing?

## Consequences
### Positive
- Benefit 1
- Benefit 2

### Negative
- Trade-off 1
- Trade-off 2

## Alternatives Considered
- Alternative 1: Why rejected
- Alternative 2: Why rejected
```

---

## Index

| ID | Title | Status | Date |
|----|-------|--------|------|
| [ADR-001](./ADR-001-contract-language.md) | Contract Language: Rust/Soroban | Accepted | 2024-07-01 |
| [ADR-002](./ADR-002-token-standard.md) | Token Standard: SEP-41 | Accepted | 2024-07-01 |
|[ADR-003](./ADR-003-bonding-curve-model.md) | Bonding Curve: Exponential AMM | Accepted | 2024-07-01 |
|[ADR-004](./ADR-004-fixed-point-math.md) | Fixed-Point Arithmetic: 10^7 Scale | Accepted | 2024-07-01 |
|[ADR-005](./ADR-005-taylor-series-exp.md) | Taylor Series for e^x | Accepted | 2024-07-01 |
|[ADR-006](./ADR-006-factory-registry.md) | Factory as Registry (Not Deployer) | Accepted | 2024-07-15 |
|[ADR-007](./ADR-007-sdk-typescript.md) | SDK Language: TypeScript | Accepted | 2024-08-01 |
|[ADR-008](./ADR-008-frontend-framework.md) | Frontend: Next.js 14 + React 18 | Accepted | 2024-07-20 |
|[ADR-009](./ADR-009-wallet-integration.md) | Wallet: Freighter API | Accepted | 2024-07-20 |
|[ADR-010](./ADR-010-deployment-strategy.md) | Deployment: GitHub Actions + Manual Mainnet | Accepted | 2024-08-01 |
|[ADR-011](./ADR-011-multi-sig-governance.md) | Mainnet Governance: Multi-sig | Accepted | 2024-08-10 |
|[ADR-012](./ADR-012-event-indexing.md) | Event Indexing: Full Record in Events | Accepted | 2024-07-15 |
|[ADR-013](./ADR-013-upgradeability.md) | Contract Upgradeability: Token Only | Accepted | 2024-07-10 |

---

## ADR-001: Contract Language: Rust/Soroban

**Status**: Accepted
**Date**: 2024-07-01

### Context
Need to choose smart contract language for Stellar/Soroban.

### Decision
Use **Rust** with **Soroban SDK** for all contracts.

### Consequences
**Positive**:
- Native Soroban support, first-class tooling
- Memory safety without GC
- Rich ecosystem (cargo, clippy, fmt)
- WASM compilation target

**Negative**:
- Steeper learning curve than AssemblyScript
- Larger WASM binaries

### Alternatives Considered
- **AssemblyScript**: Simpler but less mature Soroban support
- **Go (TinyGo)**: Experimental, not production-ready

---

## ADR-002: Token Standard: SEP-41

**Status**: Accepted
**Date**: 2024-07-01

### Context
Choose token standard for ForgeX tokens.

### Decision
Implement **SEP-41** (Stellar Ecosystem Proposal 41) token standard.

### Consequences
**Positive**:
- Interoperable with Stellar wallets/exchanges
- Standard events for indexing
- Built-in authorization model
- Supports transfer hooks for compliance

**Negative**:
- More complex than basic token
- Allowance expiration not yet enforced (v2)

### Alternatives Considered
- **ERC-20 equivalent (custom)**: No wallet support
- **SEP-10 (auth only)**: Not a token standard

---

## ADR-003: Bonding Curve Model: Exponential AMM

**Status**: Accepted
**Date**: 2024-07-01

### Context
Choose AMM pricing model for token launch.

### Decision
Use **exponential bonding curve**: `P(S) = P₀ × e^(k×S)`

### Consequences
**Positive**:
- Continuous liquidity (no order book needed)
- Deterministic pricing
- Early buyers benefit from lower prices
- Mathematically reversible (buy cost = sell payout)

**Negative**:
- Price grows exponentially (can become prohibitive)
- No concentration of liquidity at specific prices
- Requires fixed-point math (no floats in WASM)

### Alternatives Considered
- **Linear**: `P(S) = P₀ + k×S` — too simple, no exponential growth
- **Logarithmic**: Complex, less intuitive
- **Constant Product (Uniswap v2)**: Requires paired liquidity
- **StableSwap (Curve)**: Overkill for single-token launch

---

## ADR-004: Fixed-Point Arithmetic: 10^7 Scale

**Status**: Accepted
**Date**: 2024-07-01

### Context
Soroban/WASM lacks floating-point. Need fixed-point representation.

### Decision
Use **scale factor of 10^7** (7 decimal places) for all monetary values.

### Consequences
**Positive**:
- Matches Stellar's stroop precision (1 XLM = 10^7 stroops)
- Fits in i128: max value ~170,000 XLM at 7 decimals
- 15-term Taylor series converges well at this scale
- Compatible with SEP-41 decimals (0-255)

**Negative**:
- Limited dynamic range vs float
- Must handle overflow carefully

### Alternatives Considered
- **10^18 (ETH-style)**: Exceeds i128 for large supplies
- **10^9 (nano)**: Less precision for small prices
- **Rational numbers**: Too complex for WASM

---

## ADR-005: Taylor Series for e^x

**Status**: Accepted
**Date**: 2024-07-01

### Context
Exponential curve requires `e^x` computation in fixed-point.

### Decision
Use **15-term Taylor series**: `e^x = 1 + x + x²/2! + x³/3! + ...`

### Consequences
**Positive**:
- No external dependencies
- Deterministic, auditable
- 15 terms sufficient for x up to ~100 at 10^7 scale
- Pure integer arithmetic

**Negative**:
- Computational cost (15 iterations per price calc)
- Precision degrades for large x (mitigated by curve params)

### Alternatives Considered
- **Padé approximant**: More complex, similar precision
- **Lookup table**: Storage cost, less flexible
- **Continued fraction**: Similar complexity

---

## ADR-006: Factory as Registry (Not Deployer)

**Status**: Accepted
**Date**: 2024-07-15

### Context
Should factory deploy token/curve contracts or just register them?

### Decision
Factory is a **registry only** — token and curve contracts must be pre-deployed.

### Consequences
**Positive**:
- Separation of concerns
- Deployer controls contract initialization
- Factory logic simpler, more auditable
- Allows custom token/curve variants

**Negative**:
- Extra step for token creation (deploy 3 contracts)
- More complex frontend flow
- Deploy scripts needed

### Alternatives Considered
- **Factory deploys via `env.deployer()`**: Simpler UX but couples contracts
- **CREATE2-style deterministic deploy**: Not available in Soroban

---

## ADR-007: SDK Language: TypeScript

**Status**: Accepted
**Date**: 2024-08-01

### Context
Choose language for client SDK.

### Decision
**TypeScript** with `@stellar/stellar-sdk` v12.

### Consequences
**Positive**:
- Type safety for contract interfaces
- Works in browser and Node.js
- First-class Stellar SDK support
- Frontend team already uses TS

**Negative**:
- Additional build step (compilation)
- Bundle size consideration

### Alternatives Considered
- **JavaScript**: No type safety
- **Rust (wasm-bindgen)**: Overkill for client
- **Python**: Not browser-compatible

---

## ADR-008: Frontend Framework: Next.js 14 + React 18

**Status**: Accepted
**Date**: 2024-07-20

### Context
Choose frontend framework for web app.

### Decision
**Next.js 14 (App Router)** with **React 18** and **Tailwind CSS**.

### Consequences
**Positive**:
- Server components for SEO/performance
- Built-in API routes for webhooks
- Excellent TypeScript support
- Vercel deployment native

**Negative**:
- App Router learning curve
- Larger bundle than pure SPA

### Alternatives Considered
- **Vite + React**: No SSR, manual routing
- **Remix**: Smaller ecosystem
- **Astro**: Less suited for interactive dApp

---

## ADR-009: Wallet Integration: Freighter API

**Status**: Accepted
**Date**: 2024-07-20

### Context
Choose wallet for Stellar transaction signing.

### Decision
**Freighter** via `@stellar/freighter-api` npm package.

### Consequences
**Positive**:
- Most widely used Stellar wallet
- Browser extension + mobile
- Simple async API
- Supports `signTransaction` callback pattern

**Negative**:
- Browser-only (extension)
- Mobile requires deep links

### Alternatives Considered
- **Albedo**: Less adoption
- **Rabet**: Less adoption
- **Custom key management**: Security risk, UX burden

---

## ADR-010: Deployment Strategy

**Status**: Accepted
**Date**: 2024-08-01

### Context
How to deploy contracts and frontend.

### Decision
- **Contracts**: GitHub Actions workflow (manual trigger for testnet)
- **Frontend**: Vercel (auto-deploy on push to main)
- **Mainnet**: Manual approval + multi-sig

### Consequences
**Positive**:
- Reproducible builds
- Audit trail in GitHub
- Frontend preview deployments
- Mainnet safety gates

**Negative**:
- Manual step for testnet deploy
- Requires GitHub secrets management

---

## ADR-011: Mainnet Governance: Multi-sig

**Status**: Accepted
**Date**: 2024-08-10

### Context
Factory admin control on mainnet.

### Decision
Transfer factory admin to **3-of-5 multi-sig** after mainnet launch.

### Consequences
**Positive**:
- No single point of failure
- Community governance
- Transparent admin changes

**Negative**:
- Slower parameter updates
- Multi-sig coordination overhead

---

## ADR-012: Event Indexing: Full Record in Events

**Status**: Accepted
**Date**: 2024-07-15

### Context
How much data to put in contract events.

### Decision
Emit **full registry record** in `TokenCreated` event (not just IDs).

### Consequences
**Positive**:
- Indexers can reconstruct token without RPC call
- Simpler frontend (event-driven)
- Audit trail complete

**Negative**:
- Larger events (higher tx fees)
- Event size limits

---

## ADR-013: Contract Upgradeability: Token Only

**Status**: Accepted
**Date**: 2024-07-10

### Context
Which contracts should be upgradeable?

### Decision
Only **Token contract** has `__constructor` + `upgrade`. Factory and Curve are immutable.

### Consequences
**Positive**:
- Token can fix bugs / add features
- Factory/Curve immutability = trust
- Simpler audit for core AMM logic

**Negative**:
- Token admin could upgrade maliciously (mitigated by multi-sig)
- Factory/Curve bugs require new deploy + migration