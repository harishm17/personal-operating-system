# Assistant OS

## Local development

For the durable capture slice, use the commands in [docs/local-dev.md](docs/local-dev.md). The short version is:

1. `docker compose -f infra/docker/docker-compose.yml up -d`
2. `pnpm install`
3. `export PATH="$HOME/.local/node-v22.14.0-linux-x64/bin:$PATH"` if WSL is picking up a Windows Node/pnpm
4. `export DATABASE_URL=postgres://assistant:assistant@localhost:5432/assistant`
5. `pnpm verify:capture`
