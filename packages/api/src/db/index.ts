import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from '../models/index.ts';

// Try repo root, then CWD
for (const p of [resolve(import.meta.dirname, '../../../../.env.local'), '.env.local']) {
  if (existsSync(p)) {
    process.loadEnvFile(p);
    break;
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const sql = neon(databaseUrl);

export const db = drizzle({ client: sql, schema });
