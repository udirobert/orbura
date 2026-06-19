#!/usr/bin/env bash
# scripts/deploy.sh — Build locally and rsync a lean bundle to the server.
#
# Replaces the legacy "git clone on server, bun install, bun build" flow with
# a build-on-laptop + rsync-build-artifacts flow that keeps the server small.
#
# What this script does:
#   1. Build locally (Next.js + Turbopack/webpack)
#   2. Trim node_modules to keep only the server's target platform prebuilds
#   3. Rsync only the runtime files to the server (no source tree, no .git,
#      no docs, no contracts, no hf-space, no Python files, no tests)
#   4. Reload pm2 on the server
#
# Prerequisites:
#   - ssh snel-bot alias in ~/.ssh/config (or pass SERVER= alias@host)
#   - bun installed locally
#   - DNS A record for bodydebt.thisyearnofear.com pointing at the server
#
# Usage:
#   ./scripts/deploy.sh                 # default: snel-bot, linux-x64 target
#   TRIM_PLATFORM=linux-arm64 ./scripts/deploy.sh   # for ARM servers
#   SERVER=other-host ./scripts/deploy.sh

set -euo pipefail

SERVER="${SERVER:-snel-bot}"
SERVER_PORT="${SERVER_PORT:-3050}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/bodydebt}"
TRIM_PLATFORM="${TRIM_PLATFORM:-linux-x64}"

echo ">>> Deploy target: $SERVER ($DEPLOY_PATH)"
echo ">>> Trim platform: $TRIM_PLATFORM (set TRIM_PLATFORM to override)"

# 1. Build locally (idempotent — Next.js will skip if no changes)
echo ">>> Building locally..."
NEXT_TELEMETRY_DISABLED=1 bun run build

# 2. Trim local node_modules so we don't ship every platform's prebuilds
echo ">>> Trimming local node_modules for $TRIM_PLATFORM..."
TRIM_PLATFORM="$TRIM_PLATFORM" node scripts/trim-node-modules.mjs

# 3. Rsync only what's needed at runtime
echo ">>> Rsyncing lean bundle to $SERVER..."

# Build a list of files to exclude
RSYNC_EXCLUDES=(
  --exclude='.git/'
  --exclude='.next/cache/'
  --exclude='.next/standalone/'  # not used (Turbopack build)
  --exclude='docs/'
  --exclude='contracts/'
  --exclude='hf-space/'
  --exclude='models/'
  --exclude='*.py'
  --exclude='requirements.txt'
  --exclude='bun.lock'
  --exclude='.gitignore'
  --exclude='.gitattributes'
  --exclude='.husky/'
  --exclude='.commandcode/'
  --exclude='.eazo/'
  --exclude='test/'
  --exclude='tests/'
  --exclude='__tests__/'
  --exclude='*.test.ts'
  --exclude='*.test.tsx'
  --exclude='*.spec.ts'
  --exclude='vitest.config.ts'
  --exclude='drizzle.config.ts'
  --exclude='hardhat.config.ts'
  --exclude='app.py'
  --exclude='face_scan.py'
  --exclude='scoring.py'
  --exclude='health_coach.py'
  --exclude='generate_model.py'
  --exclude='stress_model.py'
  --exclude='AGENTS.md'
  --exclude='README.md'
)

# Stop the running app first so file locks don't cause rsync noise
ssh "$SERVER" "pm2 stop bodydebt 2>/dev/null || true"

# Rsync from local to server, excluding the dev artifacts
rsync -avz --delete \
  "${RSYNC_EXCLUDES[@]}" \
  --exclude='.env' \
  --exclude='ecosystem.config.cjs' \
  ./ "$SERVER:$DEPLOY_PATH/"

# .env and ecosystem.config.cjs are managed on the server — only push if missing
ssh "$SERVER" "test -f $DEPLOY_PATH/.env || scp .env $SERVER:$DEPLOY_PATH/.env 2>/dev/null || echo 'no .env to copy'"

# 4. Reload on the server
echo ">>> Reloading pm2 on $SERVER..."
ssh "$SERVER" "cd $DEPLOY_PATH && export PATH=/home/deploy/.bun/bin:\$PATH && pm2 delete bodydebt 2>/dev/null; pm2 start ecosystem.config.cjs && pm2 save"

echo ">>> Deploy complete. Live at https://bodydebt.thisyearnofear.com"
