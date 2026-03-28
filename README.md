# Assistant OS

## Local development

1. `docker compose -f infra/docker/docker-compose.yml up -d`
2. `pnpm install`
3. `pnpm --filter @assistant/api test -- health.e2e-spec.ts`
