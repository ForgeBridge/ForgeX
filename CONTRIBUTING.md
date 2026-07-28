# Contributing to ForgeX

## Development Setup

```bash
git clone https://github.com/forgex/forgex
cd forgex
./scripts/initialize.sh
```

## Code Standards

- Rust: `cargo fmt` and `cargo clippy` must pass
- TypeScript: ESLint and Prettier enforced
- Tests required for all contract changes
- Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)

## PR Process

1. Fork the repository
2. Create a feature branch
3. Run all tests
4. Submit PR with description of changes

## Contract Development

```bash
# Build contracts
cargo build --release -p forgex-token -p forgex-factory -p forgex-bonding-curve

# Run tests
cargo test --lib -p forgex-token -p forgex-factory -p forgex-bonding-curve

# Lint
cargo clippy --all-targets
cargo fmt --all --check
```

## Frontend Development

```bash
# Start dev server
npm run dev:web

# Typecheck
npm run typecheck

# Lint
npm run lint
```
