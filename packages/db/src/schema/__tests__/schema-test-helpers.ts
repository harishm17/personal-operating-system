import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createDb } from '../../index';

type SetupTask2SchemaDbOptions = {
  migrationSqlOverrides?: Partial<Record<string, string>>;
};

export async function setupTask2SchemaDb(
  migrations: string[],
  options: SetupTask2SchemaDbOptions = {},
) {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const adminDb = createDb(baseUrl);
  const schema = `task2_${randomUUID().replace(/-/g, '')}`;

  await adminDb.pool.query(`create schema "${schema}"`);
  await adminDb.pool.end();

  const schemaUrl = new URL(baseUrl);
  schemaUrl.searchParams.set('options', `-c search_path=${schema},public`);

  const dbClient = createDb(schemaUrl.toString());
  for (const migrationName of migrations) {
    const migrationSql =
      options.migrationSqlOverrides?.[migrationName] ??
      readFileSync(new URL(`../../../../../infra/migrations/${migrationName}`, import.meta.url), 'utf8');

    await dbClient.pool.query(migrationSql);
  }

  return {
    dbClient,
    schema,
    async cleanup() {
      await dbClient.pool.query(`drop schema if exists "${schema}" cascade`).catch(() => undefined);
      await dbClient.pool.end();
    },
  };
}
