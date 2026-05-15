# Local Dev

This guide covers the durable capture verification path for local development.

## Prerequisites

- Run the commands from WSL/Linux, not from a Windows shell. If `node` or `pnpm` resolves to a Windows path or shim, switch to the WSL install before running the tests.
- If `pnpm` is missing after loading WSL Node, run `corepack enable` once in that shell.
- Make sure Docker is available.
- In this workspace, the stable WSL-local toolchain is currently:

  ```bash
  export PATH="$HOME/.local/node-v22.14.0-linux-x64/bin:$PATH"
  ```

## Sequence

1. Start Postgres.

   ```bash
   docker compose -f infra/docker/docker-compose.yml up -d
   ```

2. Install dependencies.

   ```bash
   pnpm install
   ```

3. Export the local database URL used by the capture tests.

   ```bash
   export DATABASE_URL=postgres://assistant:assistant@localhost:5432/assistant
   ```

4. Run the focused schema check.

   ```bash
   pnpm --filter @assistant/db test:capture:schema
   ```

5. Run the focused API e2e check.

   ```bash
   pnpm --filter @assistant/api test:capture:e2e
   ```

6. Or run the full durable capture verification in one step.

   ```bash
   pnpm verify:capture
   ```

## WSL Notes

If the shell cannot find `node` or `pnpm`, or they point at Windows executables, prepend the WSL-local Node install to `PATH` before rerunning the commands. The durable capture scripts call `node` directly instead of relying on package-manager shims, so the active `PATH` should resolve `node` to the WSL-local binary.

If `docker compose` prints that Docker is not available in the WSL distro, start Docker Desktop on Windows and enable WSL integration for this distro. The `docker-desktop` WSL distro should show as `Running` in `wsl.exe -l -v` before starting Postgres.
