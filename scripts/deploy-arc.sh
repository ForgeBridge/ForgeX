#!/usr/bin/env bash
# Deploys the ForgeX EVM suite (Arc) and records the addresses.
#
# This script is NOT run as part of this change: run it yourself once you have a
# funded deployer account.
#
#   ./scripts/deploy-arc.sh                                   # build + test + deploy to testnet
#   ARC_RPC_URL=https://rpc.mainnet.arc.io ARC_CHAIN_ID=5042 \
#     FACTORY_ADMIN=0x... PRIVATE_KEY=0x... ARC_USDC=0x... \
#     ./scripts/deploy-arc.sh --label arc-mainnet              # mainnet
#   ./scripts/deploy-arc.sh --dry-run                          # build + test only
#
# Environment:
#   ARC_RPC_URL        RPC endpoint (default https://rpc.testnet.arc.io)
#   ARC_CHAIN_ID       Expected chain id, used as the confirmation value (5042002)
#   ARC_DEPLOY_LABEL   Suffix for contracts/evm/deployments/<label>.json (arc-testnet)
#   FACTORY_ADMIN      Factory admin address (defaults to the deployer)
#   ARC_USDC           ERC20 quote address; empty means the native Arc USDC gas token
#   PRIVATE_KEY        Deployer key; or unset it and add --ledger to use a hardware wallet
#
# It writes contracts/evm/deployments/<label>.json and echoes the NEXT_PUBLIC_*
# variables needed to point the frontend at the deployment.

set -euo pipefail

cd "$(dirname "$0")/.."

DRY_RUN=0
LABEL_SET=0
BROADCAST_ARGS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --label) shift; ARC_DEPLOY_LABEL="$1"; LABEL_SET=1 ;;
    --ledger) BROADCAST_ARGS+=("--ledger") ;;
    --verify) BROADCAST_ARGS+=("--verify") ;;
    -h|--help)
      echo "Usage: ARC_RPC_URL=... PRIVATE_KEY=0x... ./scripts/deploy-arc.sh [--dry-run|--label NAME|--ledger|--verify]" >&2
      exit 0
      ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done

command -v forge >/dev/null || { echo "Error: forge not found. Install Foundry: https://getfoundry.sh" >&2; exit 1; }

EVMDIR="contracts/evm"

export ARC_RPC_URL="${ARC_RPC_URL:-https://rpc.testnet.arc.io}"
export ARC_CHAIN_ID="${ARC_CHAIN_ID:-5042002}"
export ARC_DEPLOY_LABEL="${ARC_DEPLOY_LABEL:-arc-testnet}"
export ARC_USDC="${ARC_USDC:-}"
export FACTORY_ADMIN="${FACTORY_ADMIN:-}"

echo "ForgeX Arc deployment"
echo "  RPC           : $ARC_RPC_URL"
echo "  expected chain: $ARC_CHAIN_ID"
echo "  label         : $ARC_DEPLOY_LABEL"
echo "  quote asset   : ${ARC_USDC:-native Arc USDC (gas token)}"
echo

echo "[1/3] Building contracts"
(cd "$EVMDIR" && forge build)

echo "[2/3] Running the test suite"
(cd "$EVMDIR" && forge test)

if [ "$DRY_RUN" -eq 1 ]; then
  echo "Dry run: stopping before the broadcast step."
  exit 0
fi

echo "[3/3] Broadcasting the deployment to $ARC_RPC_URL"
echo "  Deployments are irreversible. Type the expected chain id to continue."
read -r -p "  confirm chain id (${ARC_CHAIN_ID}): " confirmation
if [ "$confirmation" != "$ARC_CHAIN_ID" ]; then
  echo "Aborted: confirmation did not match." >&2
  exit 1
fi

(cd "$EVMDIR" && forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$ARC_RPC_URL" \
  --broadcast "${BROADCAST_ARGS[@]}")

FACTORY_ADDRESS=$(jq -r '.factory // "unset"' "$EVMDIR/deployments/${ARC_DEPLOY_LABEL}.json")

echo
echo "Deployment recorded in $EVMDIR/deployments/${ARC_DEPLOY_LABEL}.json"
echo
echo "Point the frontend at Arc by adding to .env.local:"
cat <<ENV
NEXT_PUBLIC_ARC_RPC_URL=$ARC_RPC_URL
NEXT_PUBLIC_ARC_CHAIN_ID=$ARC_CHAIN_ID
NEXT_PUBLIC_ARC_FACTORY_ADDRESS=$FACTORY_ADDRESS
NEXT_PUBLIC_ARC_QUOTE_TOKEN_ADDRESS=${ARC_USDC:-0x0000000000000000000000000000000000000000}
ENV
