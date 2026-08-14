#!/usr/bin/env bash
set -euo pipefail

echo "Building ForgeX Soroban contracts..."

cd "$(dirname "$0")/.."

if ! rustup target list --installed | grep -q '^wasm32v1-none$'; then
    echo "Adding wasm32v1-none target..."
    rustup target add wasm32v1-none
fi

# Build all workspace members targeting wasm
cargo build --release --target wasm32v1-none \
  -p forgex-token \
  -p forgex-factory \
  -p forgex-bonding-curve

echo "Build complete. WASM files:"
find target/wasm32v1-none/release -maxdepth 1 -name "*.wasm" -exec ls -lh {} \;
