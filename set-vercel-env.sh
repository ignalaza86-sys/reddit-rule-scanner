#!/usr/bin/env bash
# =============================================================================
# Vercel Environment Variables Setup Script
# Project: reddit-rule-scanner
# GitHub:  ignalaza86-sys/reddit-rule-scanner
# =============================================================================
#
# This script adds the required environment variables to the Vercel project.
# It requires the Vercel CLI to be authenticated first.
#
# PREREQUISITES:
#   1. Install Vercel CLI:  npm install -g vercel
#   2. Authenticate:         vercel login
#   3. Link the project:     vercel link (run from the project directory)
#
# ALTERNATIVE: Set VERCEL_TOKEN env var and use the --token flag
#   export VERCEL_TOKEN="your-token-here"
#   Then run this script with: bash set-vercel-env.sh --token $VERCEL_TOKEN
# =============================================================================

set -euo pipefail

PROXY_URL="https://reddit-rule-proxy.ignalaza.workers.dev"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$PROJECT_DIR"

TOKEN_FLAG=""
if [ "${1:-}" = "--token" ] && [ -n "${2:-}" ]; then
  TOKEN_FLAG="--token $2"
fi

echo "========================================="
echo " Setting Vercel Environment Variables"
echo " Project: reddit-rule-scanner"
echo "========================================="
echo ""

# Add NEXT_PUBLIC_REDDIT_PROXY_URL (all environments)
echo "[1/2] Adding NEXT_PUBLIC_REDDIT_PROXY_URL..."
vercel env add NEXT_PUBLIC_REDDIT_PROXY_URL production preview development \
  --value "$PROXY_URL" \
  --no-sensitive \
  --yes \
  $TOKEN_FLAG

echo ""

# Add REDDIT_PROXY_URL (all environments)
echo "[2/2] Adding REDDIT_PROXY_URL..."
vercel env add REDDIT_PROXY_URL production preview development \
  --value "$PROXY_URL" \
  --no-sensitive \
  --yes \
  $TOKEN_FLAG

echo ""
echo "========================================="
echo " Environment variables set successfully!"
echo "========================================="
echo ""
echo "To verify, run:  vercel env ls"
echo "To redeploy:     vercel --prod"
