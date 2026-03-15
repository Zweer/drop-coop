import type { Context, Next } from 'hono';

const HMAC_KEY = process.env.HMAC_KEY || 'dc-bulk-7f3a9e2b1d';

let cryptoKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (!cryptoKey) {
    cryptoKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(HMAC_KEY),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify'],
    );
  }
  return cryptoKey;
}

export async function hmacMiddleware(c: Context, next: Next) {
  const signature = c.req.header('X-Signature');
  if (!signature) {
    return c.json({ error: 'Missing signature' }, 401);
  }

  // Clone to avoid consuming the body
  const body = await c.req.raw.clone().text();

  const key = await getKey();
  const data = new TextEncoder().encode(body);
  const expected = await crypto.subtle.sign('HMAC', key, data);
  const expectedHex = Array.from(new Uint8Array(expected))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (signature !== expectedHex) {
    return c.json({ error: 'Invalid signature' }, 401);
  }

  await next();
}
