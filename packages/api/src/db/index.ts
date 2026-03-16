import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import * as schema from '../models/index.ts';

export let db: import('drizzle-orm/neon-http').NeonHttpDatabase<typeof schema>;

if (process.env.USE_PGLITE) {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const client = new PGlite();

  const dir = resolve(import.meta.dirname, '../../drizzle');
  for (const f of readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    const sql = readFileSync(resolve(dir, f), 'utf-8');
    for (const stmt of sql
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean)) {
      await client.exec(stmt);
    }
  }

  db = drizzle({ client, schema }) as unknown as typeof db;
} else {
  for (const p of [resolve(import.meta.dirname, '../../../../.env.local'), '.env.local']) {
    if (existsSync(p)) {
      process.loadEnvFile(p);
      break;
    }
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  const { neon } = await import('@neondatabase/serverless');
  const { drizzle } = await import('drizzle-orm/neon-http');
  db = drizzle({ client: neon(databaseUrl), schema });
}
