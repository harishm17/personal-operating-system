#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo 'DATABASE_URL is required for @assistant/db tests' >&2
  exit 1
fi

if [[ "${1:-}" == "--" ]]; then
  shift
fi

NODE_BIN="$(which -a node | grep -v node_modules | head -n 1)"
exec "$NODE_BIN" ./node_modules/vitest/vitest.mjs run "$@"
