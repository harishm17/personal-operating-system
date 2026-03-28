import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { dbSchema } from './schema';

export function createDb(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to initialize the database client');
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema: dbSchema });

  return { pool, db };
}
