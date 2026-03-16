import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import { drizzle } from 'drizzle-orm/pglite';

import * as schema from '../src/models/index.ts';

export type TestDb = PgliteDatabase<typeof schema>;

const MIGRATIONS_DIR = resolve(import.meta.dirname, '../drizzle');

/** Read and sort migration SQL files. */
function getMigrationSql(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(resolve(MIGRATIONS_DIR, f), 'utf-8'));
}

/** Create an in-memory PGlite database with all migrations applied. */
export async function createTestDb(): Promise<{ db: TestDb; close: () => Promise<void> }> {
  const client = new PGlite();
  const db = drizzle({ client, schema });

  for (const sql of getMigrationSql()) {
    const statements = sql
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      await client.exec(stmt);
    }
  }

  return { db, close: () => client.close() };
}

const HMAC_KEY = 'dc-bulk-7f3a9e2b1d';

/** Compute HMAC-SHA256 signature for a request body (same as frontend). */
export async function hmacSign(body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(HMAC_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Register a player and return token + playerId. */
export async function registerPlayer(
  app: { request: Function },
  username = 'e2etest',
  password = 'secret123',
  ip?: string,
): Promise<{ token: string; refreshToken: string; playerId: string }> {
  const res = await app.request('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(ip ? { 'X-Forwarded-For': ip } : {}),
    },
    body: JSON.stringify({ username, password }),
  });
  const body = (await res.json()) as Record<string, unknown>;
  return {
    token: body.token as string,
    refreshToken: body.refreshToken as string,
    playerId: (body.player as Record<string, string>).id,
  };
}

/** Helper to make authenticated requests. */
/** Default coords for test orders. */
export const TEST_ORDER_DEFAULTS = {
  pickupLat: 45.464,
  pickupLng: 9.19,
  dropoffLat: 45.47,
  dropoffLng: 9.195,
};

export function createClient(app: { request: Function }, tokenRef: { value: string }, ip?: string) {
  const ipHeader = ip ? { 'X-Forwarded-For': ip } : {};

  function get(path: string, headers: Record<string, string> = {}) {
    return app.request(path, {
      headers: { Authorization: `Bearer ${tokenRef.value}`, ...ipHeader, ...headers },
    });
  }

  function post(path: string, body: unknown, headers: Record<string, string> = {}) {
    return app.request(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenRef.value}`,
        ...ipHeader,
        ...headers,
      },
      body: JSON.stringify(body),
    });
  }

  async function signedPost(path: string, body: unknown) {
    const bodyStr = JSON.stringify(body);
    const signature = await hmacSign(bodyStr);
    return post(path, body, { 'X-Signature': signature });
  }

  async function signedGet(path: string) {
    const signature = await hmacSign('');
    return get(path, { 'X-Signature': signature });
  }

  return { get, post, signedPost, signedGet };
}
