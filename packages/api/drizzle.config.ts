import { existsSync } from 'node:fs';

import { defineConfig } from 'drizzle-kit';

for (const p of ['../../.env.local', '.env.local']) {
  if (existsSync(p)) {
    process.loadEnvFile(p);
    break;
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

export default defineConfig({
  schema: './src/models',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});
