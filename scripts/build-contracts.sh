#!/usr/bin/env bash
set -euo pipefail

echo "Building ForgeX Soroban contracts..."

cd "$(dirname "$0")/.."

# Build all workspace members
cargo build --release \
  -p forgex-token \
  -p forgex-factory \
  -p forgex-bonding-curve

echo "Build complete. WASM files:"
find target/release -name "*.wasm" -exec ls -lh {} \;
