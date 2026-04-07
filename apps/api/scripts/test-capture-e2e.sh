#!/usr/bin/env bash
set -euo pipefail
source /home/harish/.nvm/nvm.sh
set +u
nvm use --lts >/dev/null
set -u
NODE_BIN="$(nvm which current)"
exec "$NODE_BIN" /home/harish/.config/superpowers/worktrees/personal-operating-system/capture-and-promotion-v1/apps/api/node_modules/vitest/vitest.mjs run test/capture.e2e-spec.ts
