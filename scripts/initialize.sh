#!/usr/bin/env bash
set -euo pipefail

echo "ForgeX - First-Time Setup"
echo "========================="
echo ""

cd "$(dirname "$0")/.."

# Check Node.js
if command -v node &>/dev/null; then
    echo "Node.js $(node --version)"
else
    echo "Error: Node.js not found. Install from https://nodejs.org"
    exit 1
fi

# Check Rust
if command -v cargo &>/dev/null; then
    echo "Rust $(cargo --version)"
else
    echo "Error: Rust not found. Install from https://rustup.rs"
    exit 1
fi

# Install npm dependencies
echo ""
echo "Installing npm dependencies..."
npm install

# Install soroban CLI if not present
if ! command -v soroban &>/dev/null; then
    echo ""
    echo "Installing soroban CLI..."
    cargo install soroban-cli
fi

# Create .env from example if not exists
if [ ! -f .env.local ]; then
    cp .env.example .env.local 2>/dev/null || cat > .env.local <<ENV
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_FACTORY_CONTRACT_ID=
NEXT_PUBLIC_BONDING_CURVE_CONTRACT_ID=
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud
ENV
    echo ".env.local created"
fi

echo ""
echo "Setup complete! Next steps:"
echo "  1. Build contracts:    ./scripts/build-contracts.sh"
echo "  2. Fund testnet:       ./scripts/fund-testnet.sh"
echo "  3. Deploy to testnet:  ./scripts/deploy-testnet.sh"
echo "  4. Start frontend:     npm run dev:web"
