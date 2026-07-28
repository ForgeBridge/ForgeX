#!/usr/bin/env bash
set -euo pipefail

echo "Deploying ForgeX contracts to Stellar Testnet..."

cd "$(dirname "$0")/.."

command -v soroban &>/dev/null || { echo "Error: soroban CLI not found. Install with: cargo install soroban-cli"; exit 1; }

export SOROBAN_RPC_URL="${SOROBAN_RPC_URL:-https://soroban-testnet.stellar.org}"
export SOROBAN_NETWORK_PASSPHRASE="${SOROBAN_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
export SOROBAN_ACCOUNT="${SOROBAN_ACCOUNT:?SOROBAN_ACCOUNT (deployer secret key) not set}"

echo "Building contracts..."
./scripts/build-contracts.sh

echo "Deploying Factory contract..."
FACTORY_ID=$(soroban contract deploy \
  --wasm target/release/forgex_factory.wasm \
 --rpc-url "$SOROBAN_RPC_URL" \
  --network-passphrase "$SOROBAN_NETWORK_PASSPHRASE" \
  --source-account "$SOROBAN_ACCOUNT")
echo "Factory contract ID: $FACTORY_ID"

echo "Initializing Factory..."
soroban contract invoke \
  --id "$FACTORY_ID" \
  --rpc-url "$SOROBAN_RPC_URL" \
  --network-passphrase "$SOROBAN_NETWORK_PASSPHRASE" \
  --source-account "$SOROBAN_ACCOUNT" \
  -- initialize \
  --admin "$SOROBAN_ACCOUNT"

echo "Deploying Bonding Curve contract..."
BONDING_CURVE_ID=$(soroban contract deploy \
  --wasm target/release/forgex_bonding_curve.wasm \
  --rpc-url "$SOROBAN_RPC_URL" \
  --network-passphrase "$SOROBAN_NETWORK_PASSPHRASE" \
  --source-account "$SOROBAN_ACCOUNT")
echo "Bonding Curve contract ID: $BONDING_CURVE_ID"

cat > .env.testnet <<ENV
SOROBAN_NETWORK=testnet
SOROBAN_RPC_URL=$SOROBAN_RPC_URL
SOROBAN_NETWORK_PASSPHRASE=$SOROBAN_NETWORK_PASSPHRASE
FACTORY_CONTRACT_ID=$FACTORY_ID
BONDING_CURVE_CONTRACT_ID=$BONDING_CURVE_ID
ENV

echo "Deployment complete. Contract IDs saved to .env.testnet"
