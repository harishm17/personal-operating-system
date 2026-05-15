#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"

cd "$API_DIR"
exec bash scripts/run-vitest.sh test/capture.e2e-spec.ts
