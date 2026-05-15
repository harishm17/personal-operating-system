#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "--" ]]; then
  shift
fi

NODE_BIN="$(which -a node | grep -v node_modules | head -n 1)"
exec "$NODE_BIN" ./node_modules/vitest/vitest.mjs run "$@"
