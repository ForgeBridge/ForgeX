# Environment Setup for Contributors

This guide covers setting up a complete ForgeX development environment.

---

## Prerequisites

### Required Software

| Tool | Version | Install Command |
|------|---------|-----------------|
| Git | 2.40+ | `brew install git` / `apt install git` |
| Node.js | 18+ | `brew install node@18` / `nvm install 18` |
| Rust | 1.75+ | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| soroban-cli | Latest | `cargo install --locked soroban-cli` |
| wasm32 target | - | `rustup target add wasm32v1-none` |

### Recommended

| Tool | Purpose |
|------|---------|
| `just` | Command runner (`cargo install just`) |
| `gh` | GitHub CLI (`brew install gh`) |
| `docker` | Containerized builds |
| `direnv` | Auto-load `.envrc` |

---

## Quick Start (5 Minutes)

```bash
# 1. Clone
git clone https://github.com/ForgeBridge/ForgeX
cd ForgeX

# 2. Install Node deps
npm ci

# 3. Build contracts
./scripts/build-contracts.sh

# 4. Verify
cargo test --workspace --lib
npm run typecheck
npm run build
```

---

## Detailed Setup

### 1. Rust Toolchain

```bash
# Install rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Install stable toolchain
rustup default stable
rustup component add rustfmt clippy

# Add WASM target
rustup target add wasm32v1-none

# Verify
rustc --version
cargo --version
soroban --version
```

### 2. Node.js Environment

```bash
# Option A: nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Option B: fnm (faster)
curl -fsSL https://fnm.vercel.app/install | bash
fnm install 18

# Option C: System package manager
# macOS: brew install node@18
# Ubuntu: apt install nodejs npm

# Verify
node --version  # v18.x.x
npm --version
```

### 3. Soroban CLI

```bash
# Install from crates.io (latest)
cargo install --locked soroban-cli

# Or install specific version
cargo install --locked --version 20.0.0 soroban-cli

# Verify
soroban --version
```

### 4. Project Dependencies

```bash
# Root workspace
npm ci

# Contracts (Rust)
cd contracts
cargo fetch
cargo build --workspace --release

# SDK
cd ../packages/sdk
npm ci

# Web
cd ../../apps/web
npm ci
```

---

## Configuration

### 1. Environment Variables

```bash
# Copy example
cp .env.example .env.local

# Edit with your values
# Required for deployment:
# SOROBAN_ACCOUNT=<your-secret-key>
# NEXT_PUBLIC_FACTORY_CONTRACT_ID=<deployed-id>
# NEXT_PUBLIC_BONDING_CURVE_CONTRACT_ID=<deployed-id>
```

### 2. IDE Configuration

#### VS Code (Recommended)

Install extensions:
- `rust-analyzer` (Rust)
- `TypeScript and JavaScript Language Features` (built-in)
- `Tailwind CSS IntelliSense`
- `ESLint`
- `Prettier`

Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

#### IntelliJ / CLion

- Install Rust plugin
- Enable `cargo fmt` on save
- Configure TypeScript with project tsconfig

### 3. Git Hooks (Optional)

```bash
# Install pre-commit
pip install pre-commit
pre-commit install

# Or use husky (Node)
npx husky install
npx husky add .husky/pre-commit "npm run lint"
```

---

## Running Tests

### Contract Tests (Rust)

```bash
# All contracts
cargo test --workspace --lib

# Specific contract
cd contracts/token && cargo test --lib
cd ../factory && cargo test --lib
cd ../bonding-curve && cargo test --lib

# With output
cargo test --lib -- --nocapture

# Specific test
cargo test --lib test_mint_enforces_max_supply
```

### SDK Tests (TypeScript)

```bash
cd packages/sdk

# Typecheck
npm run typecheck

# Lint
npm run lint

# Unit tests (when added)
npm run test

# Build
npm run build
```

### Frontend Tests

```bash
cd apps/web

# Typecheck
npm run typecheck

# Lint
npm run lint

# Build (verifies no errors)
npm run build

# Dev server
npm run dev
```

---

## Common Workflows

### Add New Contract

```bash
# 1. Create directory
mkdir contracts/new-contract
cd contracts/new-contract

# 2. Initialize Cargo project
cargo init --lib --name forgex_new_contract

# 3. Add to workspace (edit root Cargo.toml)
# [workspace]
# members = [
#   "token",
#   "factory",
#   "bonding-curve",
#   "new-contract",  # Add here
# ]

# 4. Configure Cargo.toml
# [dependencies]
# soroban-sdk = { version = "27.0.3", features = ["contract"] }

# 5. Write contract in src/lib.rs
# 6. Build to verify
cargo build --release --target wasm32v1-none
```

### Update SDK for New Contract Method

```bash
# 1. Add method to appropriate client in packages/sdk/src/contracts/
# 2. Add types to packages/sdk/src/types/
# 3. Export from packages/sdk/src/index.ts
# 4. Run typecheck
cd packages/sdk && npm run typecheck
# 5. Update web hooks/components to use new method
```

### Deploy to Testnet

```bash
# 1. Fund account
export SOROBAN_ACCOUNT=<your-secret>
./scripts/fund-testnet.sh

# 2. Deploy
./scripts/deploy-testnet.sh

# 3. Update .env.local with contract IDs
# 4. Test frontend
npm run dev:web
```

---

## Troubleshooting

### Rust Build Fails

```bash
# Clean and rebuild
cargo clean
rustup update
cargo build --release --target wasm32v1-none

# If linker errors
rustup component add rust-src
cargo install -f cargo-wasi
```

### Node Version Mismatch

```bash
# Use nvm/fnm to switch
nvm use 18
# Or
fnm use 18

# Verify in shell
node --version
```

### soroban-cli Not Found

```bash
# Ensure cargo bin in PATH
export PATH="$HOME/.cargo/bin:$PATH"
# Add to ~/.bashrc / ~/.zshrc permanently
```

### WASM Target Missing

```bash
rustup target add wasm32v1-none
```

### TypeScript Errors After Contract Changes

```bash
# Rebuild SDK types
cd packages/sdk
npm run build
# Restart TS server in IDE (Cmd+Shift+P > TypeScript: Restart TS Server)
```

### Frontend Can't Connect to RPC

```bash
# Check .env.local
cat apps/web/.env.local

# Verify RPC URL accessible
curl https://soroban-testnet.stellar.org
```

---

## CI/CD Local Simulation

```bash
# Run same checks as GitHub Actions
# Contracts
cd contracts
cargo fmt --all --check
cargo clippy --all-targets --all-features -D warnings
cargo test --lib --all-features
cargo build --release --target wasm32v1-none

# SDK
cd ../packages/sdk
npm run typecheck
npm run lint
npm run build

# Web
cd ../../apps/web
npm run typecheck
npm run lint
npm run build
```

---

## Useful Aliases

Add to `~/.bashrc` or `~/.zshrc`:

```bash
alias fx-contracts='cd ~/ForgeX/contracts'
alias fx-sdk='cd ~/ForgeX/packages/sdk'
alias fx-web='cd ~/ForgeX/apps/web'
alias fx-test='cargo test --workspace --lib && npm run typecheck --prefix packages/sdk && npm run typecheck --prefix apps/web'
alias fx-build='./scripts/build-contracts.sh && npm run build --prefix packages/sdk && npm run build --prefix apps/web'
alias fx-dev='npm run dev --prefix apps/web'
```

---

## Getting Help

- **Documentation**: `/docs` directory
- **Issues**: GitHub Issues
- **Discord**: [ForgeX Dev Chat](https://discord.gg/forgex) (placeholder)
- **Email**: dev@forgex.app