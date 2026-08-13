# Contract Contribution Guidelines

## Overview

This document outlines the standards and processes for contributing to ForgeX smart contracts (Rust/Soroban).

---

## Getting Started

### Prerequisites

- Rust 1.75+ (via `rustup`)
- `cargo` and `soroban-cli`
- `wasm32v1-none` target: `rustup target add wasm32v1-none`

### Repository Structure

```
contracts/
├── token/              # SEP-41 Token contract
│   ├── src/
│   │   ├── lib.rs      # Contract entry point
│   │   ├── token.rs    # Core logic
│   │   ├── storage.rs  # Storage keys & helpers
│   │   ├── events.rs   # Event definitions
│   │   ├── error.rs    # Error codes
│   │   └── test.rs     # Unit tests
│   └── Cargo.toml
├── factory/            # Token factory & registry
│   ├── src/
│   │   ├── lib.rs
│   │   ├── factory.rs
│   │   ├── registry.rs
│   │   ├── events.rs
│   │   ├── error.rs
│   │   └── test.rs
│   └── Cargo.toml
└── bonding-curve/      # Exponential AMM
    ├── src/
    │   ├── lib.rs
    │   ├── curve.rs
    │   ├── math.rs     # Fixed-point math
    │   ├── storage.rs
    │   ├── events.rs
    │   ├── error.rs
    │   └── test.rs
    └── Cargo.toml
```

---

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feat/contract-name-short-description
```

### 2. Make Changes

Follow the coding standards below.

### 3. Run Checks Locally

```bash
# Format
cargo fmt --all --check

# Lint
cargo clippy --all-targets --all-features -D warnings

# Test
cargo test --lib --all-features

# Build (verifies WASM compiles)
cargo build --release --target wasm32v1-none
```

### 4. Commit with Conventional Commits

```
feat(token): add transfer hook reentrancy guard
fix(curve): correct Taylor series coefficient for x^3 term
docs(factory): update create_token parameter docs
test(token): add mint max_supply edge case
refactor(curve): extract math helpers to math.rs
```

### 5. Push and Open PR

```bash
git push origin feat/contract-name-short-description
# Open PR on GitHub
```

---

## Coding Standards

### Rust Style

- **Edition**: 2021
- **Formatter**: `cargo fmt` (default config)
- **Linter**: `cargo clippy` with `-D warnings` (deny all warnings)

### Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| Modules | `snake_case` | `storage.rs` |
| Structs | `PascalCase` | `TokenInfo` |
| Enums | `PascalCase` | `ContractError` |
| Functions | `snake_case` | `get_balance` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_NAME_LEN` |
| Type parameters | `PascalCase` | `TMemo` |
| Error variants | `PascalCase` | `InsufficientBalance` |

### Documentation

- **Public items**: Must have `///` doc comments
- **Modules**: Include module-level doc comment
- **Functions**: Document params, returns, errors, and panics
- **Complex logic**: Inline comments for non-obvious math

```rust
/// Computes the cost to buy `amount_out` tokens from current supply.
///
/// Uses fixed-point Taylor series approximation of e^(k*S) with 15 terms.
///
/// # Arguments
/// * `supply` - Current tokens sold (S)
/// * `amount_out` - Tokens to buy
/// * `params` - Curve parameters (P₀, k)
///
/// # Returns
/// Cost in stroops (i128)
///
/// # Errors
/// Returns `ContractError::MathOverflow` on arithmetic overflow.
fn compute_buy_cost(supply: i128, amount_out: i128, params: CurveParams) -> Result<i128, ContractError> {
    // ...
}
```

### Error Handling

- **Custom error enums** per contract (`ContractError`, `TokenError`)
- **Explicit error codes** (1, 2, 3...) for on-chain debugging
- **No `panic!`** in production paths — return `Result`
- **`panic!` only** for:
  - Unreachable code (`unreachable!()`)
  - Invariant violations that indicate bug
  - Internal logic errors that should never happen

```rust
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ContractError {
    AlreadyInitialized = 1,
    InvalidTokenAddress = 2,
    TokenExists = 3,
    // ...
}
```

### Testing

- **Unit tests** in `test.rs` modules
- **Integration tests** in `tests/` directory (if needed)
- **Test coverage** target: >90% for core logic
- **Test naming**: `test_<function>_<scenario>`

```rust
#[test]
fn test_mint_enforces_max_supply() { ... }

#[test]
fn test_buy_rejects_expired_deadline() { ... }

#[test]
fn test_transfer_hook_reentrancy_blocked() { ... }
```

---

## Contract-Specific Guidelines

### Token Contract (SEP-41)

#### Required Features
- [ ] `mint`/`burn` admin-only + target account auth
- [ ] `max_supply` enforcement
- [ ] `transfer`/`transfer_from` pause guard
- [ ] Transfer hook with reentrancy guard
- [ ] SEP-41 events for all state changes
- [ ] Allowance with expiration (stored, enforcement v2)
- [ ] Admin clawback (`admin_transfer`)
- [ ] Authorization list (`authorized`/`set_authorized`)

#### Storage Keys
```rust
const ADMIN: Symbol = symbol!("admin");
const PAUSED: Symbol = symbol!("paused");
const TOTAL_SUPPLY: Symbol = symbol!("total_supply");
const BALANCE_PREFIX: Symbol = symbol!("balance");
const ALLOWANCE_PREFIX: Symbol = symbol!("allowance");
const TRANSFER_HOOK: Symbol = symbol!("transfer_hook");
const AUTHORIZED_PREFIX: Symbol = symbol!("authorized");
const REENTRANCY_GUARD: Symbol = symbol!("reentrancy_guard");
```

### Factory Contract

#### Required Features
- [ ] Admin-owned (`initialize`, `set_admin`, `remove_token`)
- [ ] Token registry with unique constraints (address, name, symbol)
- [ ] Pre-deployed token/curve address validation
- [ ] Stable pagination order (creation timestamp)
- [ ] `TokenCreated` event with full record
- [ ] Lookup by name/symbol

#### Storage Keys
```rust
const ADMIN: Symbol = symbol!("admin");
const TOKENS: Symbol = symbol!("tokens");           // Vec<TokenInfo>
const TOKEN_NAMES: Symbol = symbol!("token_names"); // Map<Name, TokenId>
const TOKEN_SYMBOLS: Symbol = symbol!("token_syms");// Map<Symbol, TokenId>
const TOKEN_COUNT: Symbol = symbol!("token_count");
```

### Bonding Curve Contract

#### Required Features
- [ ] Exponential pricing: `P(S) = P₀ × e^(k×S)`
- [ ] Fixed-point arithmetic (`SCALE = 10^7`)
- [ ] Taylor series `e^x` (15 terms)
- [ ] `buy` with `max_cost` slippage + `deadline`
- [ ] `sell` with `min_payout` slippage + `deadline`
- [ ] Atomic reserve updates
- [ ] Admin-only `initialize`

#### Math Module
```rust
const SCALE: i128 = 10_000_000;
const TAYLOR_TERMS: usize = 15;

/// e^x approximation using Taylor series
fn exp_taylor(x: i128) -> i128 { ... }

/// Compute buy cost: ∫ P(S) dS from supply to supply+amount
fn compute_buy_cost(supply: i128, amount: i128, params: CurveParams) -> i128 { ... }

/// Compute sell payout: ∫ P(S) dS from supply-amount to supply
fn compute_sell_payout(supply: i128, amount: i128, params: CurveParams) -> i128 { ... }
```

#### Storage Keys
```rust
const TOKEN_ID: Symbol = symbol!("token_id");
const CURVE_PARAMS: Symbol = symbol!("curve_params");
const RESERVE: Symbol = symbol!("reserve");
const TOKENS_SOLD: Symbol = symbol!("tokens_sold");
const ADMIN: Symbol = symbol!("admin");
```

---

## CI/CD Pipeline

### GitHub Actions (`.github/workflows/contracts-ci.yml`)

Runs on every push/PR to `contracts/**`, `Cargo.toml`, `Cargo.lock`:

1. **Format check**: `cargo fmt --all --check`
2. **Clippy**: `cargo clippy --all-targets --all-features -D warnings`
3. **Build**: `cargo build --release --target wasm32v1-none`
4. **Test**: `cargo test --lib --all-features`

All steps must pass for PR merge.

---

## Release Process

### Versioning

Contracts use **semantic versioning** in `Cargo.toml`:
- `MAJOR`: Breaking storage layout or interface changes
- `MINOR`: New features, backward-compatible
- `PATCH`: Bug fixes, no interface changes

### Deploy Steps

1. Update version in `Cargo.toml`
2. Tag release: `git tag -a contracts/v1.2.0 -m "Release contracts v1.2.0"`
3. Push tag: `git push origin contracts/v1.2.0`
4. GitHub Actions builds WASM and attaches to release
4. Update SDK if interface changed

---

## Security Considerations

### Before Submitting PR

- [ ] No `unsafe` code without justification
- [ ] All arithmetic uses checked operations
- [ ] No unvalidated user input in storage writes
- [ ] Admin functions require `require_auth()`
- [ ] Events emitted for all state changes
- [ ] Error codes match `error.rs` definitions

### Audit Checklist

See [SECURITY_POLICY.md](./SECURITY_POLICY.md#audit-checklist) for full audit checklist.

---

## Code Review Checklist

Reviewers verify:

- [ ] Code compiles (`cargo build --target wasm32v1-none`)
- [ ] All tests pass (`cargo test --lib`)
- [ ] Clippy clean (`cargo clippy -D warnings`)
- [ ] Format correct (`cargo fmt --check`)
- [ ] Documentation updated for public API changes
- [ ] Error codes documented
- [ ] No breaking changes without version bump
- [ ] Storage keys don't conflict
- [ ] Events include sufficient data for indexing

---

## Useful Commands

```bash
# Run all checks
cargo fmt --all --check && \
cargo clippy --all-targets --all-features -D warnings && \
cargo test --lib --all-features && \
cargo build --release --target wasm32v1-none

# Generate docs
cargo doc --no-deps --open

# Check for unused dependencies
cargo machete

# Audit dependencies
cargo audit

# View WASM size
ls -lh target/wasm32v1-none/release/*.wasm
```

---

## Resources

- [Soroban SDK Docs](https://soroban.stellar.org/docs)
- [Stellar SEP-41](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0041.md)
- [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- [Clippy Lints](https://rust-lang.github.io/rust-clippy/master/)