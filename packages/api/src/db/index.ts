import { existsSync } from 'node:fs';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from '../models/index.ts';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const sql = neon(databaseUrl);

export const db = drizzle({ client: sql, schema });
