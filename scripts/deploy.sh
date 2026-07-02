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

SERVER="${SERVER:-nuncio-vultr}"
SERVER_PORT="${SERVER_PORT:-3050}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/bodydebt}"
TRIM_PLATFORM="${TRIM_PLATFORM:-linux-x64}"
BUN_PATH_REMOTE="${BUN_PATH_REMOTE:-/home/linuxuser/.bun/bin}"

echo ">>> Deploy target: $SERVER ($DEPLOY_PATH)"
echo ">>> Trim platform: $TRIM_PLATFORM (set TRIM_PLATFORM to override)"

# 0. Sanity check ZK artefacts. These files are gitignored (pk.key is 138MB,
#    srs.key is 4MB), so a fresh clone won't have them. We rsync them as part
#    of the bundle below, but with --delete that means a missing file locally
#    would also wipe it from the server. Abort early if any are missing — the
#    user needs to run `python scripts/compile-circuit.py` first to generate
#    them. Without these, the Web Worker's initEzkl() can't fetch the proving
#    key and falls back to a mock proof, which the UI surfaces as a confusing
#    "Proof invalid" error.
ZK_REQUIRED=(
  public/ezkl/compiled.ezkl
  public/ezkl/pk.key
  public/ezkl/srs.key
  public/ezkl/vk.key
  public/ezkl/vka.bytes
  public/ezkl/settings.json
  public/ezkl/vk-chunks.json
  public/ezkl/vk-digest.json
)
for f in "${ZK_REQUIRED[@]}"; do
  if [ ! -f "$f" ]; then
    echo "ERROR: $f is missing. The Web Worker needs this at runtime."
    echo "       Regenerate the ZK pipeline:"
    echo "         python scripts/compile-circuit.py"
    echo "         bun run zk:chunks"
    echo "       Then re-run this script."
    exit 1
  fi
done

# 1. Build Next.js app locally (idempotent — Next.js will skip if no changes)
echo ">>> Building Next.js app locally..."
NEXT_TELEMETRY_DISABLED=1 npm run build

# 1b. Build Storybook and copy into public/ so Next.js serves it at /storybook/
echo ">>> Building Storybook..."
bun run build-storybook 2>&1
rm -rf public/storybook
cp -r storybook-static public/storybook
echo ">>> Storybook build copied to public/storybook/"

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
  --exclude='*.py'
  --exclude='requirements.txt'
  --exclude='bun.lock'
  --exclude='.gitignore'
  --exclude='.gitattributes'
  --exclude='.husky/'
  --exclude='.commandcode/'
  --exclude='.eazo/'
  --exclude='storybook-static/'
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
  ./ "$SERVER:$DEPLOY_PATH/"

# .env and ecosystem.config.cjs are managed on the server — only push if missing
ssh "$SERVER" "test -f $DEPLOY_PATH/.env || scp .env $SERVER:$DEPLOY_PATH/.env 2>/dev/null || echo 'no .env to copy'"

# 4. Reload on the server
echo ">>> Reloading pm2 on $SERVER..."
ssh "$SERVER" "cd $DEPLOY_PATH && export PATH=$BUN_PATH_REMOTE:\$PATH && pm2 delete bodydebt 2>/dev/null; pm2 start ecosystem.config.cjs && pm2 save"

echo ">>> Deploy complete. Live at https://bodydebt.thisyearnofear.com"
