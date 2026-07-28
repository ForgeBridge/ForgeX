#!/usr/bin/env bash
set -euo pipefail

echo "Funding Stellar Testnet accounts via Friendbot..."
echo ""

cd "$(dirname "$0")/.."

SOROBAN_ACCOUNT="${SOROBAN_ACCOUNT:?SOROBAN_ACCOUNT not set}"
FRIENDBOT_URL="https://friendbot-future.stellar.org"

echo "Funding $SOROBAN_ACCOUNT..."
curl -s "$FRIENDBOT_URL?addr=$SOROBAN_ACCOUNT" | head -c 200

echo ""
echo "Done. Check balance at: https://stellar.expert/explorer/testnet/account/$SOROBAN_ACCOUNT"
