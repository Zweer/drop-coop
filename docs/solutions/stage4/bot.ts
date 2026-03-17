/**
 * Stage 4 Bot — Minified Madness
 * Uses obfuscated /api/x/ endpoints for 2x rate limit.
 *
 * The mapping (found in frontend JS):
 *   o:a3f8b2 r:7c9d1e z:b5e4a1 p:d2c7f3 c:e8a1b4 b:f4c2d9 a:9b7e3a e:c1d5f8
 *
 * Usage: BASE_URL=http://localhost:5173 npx tsx docs/solutions/stage4/bot.ts
 */
const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const HMAC_KEY = 'dc-bulk-7f3a9e2b1d';
let token = '';
let refreshToken = '';

// Stage 4: obfuscated path mapping (2x rate limit)
const X = {
  orders: '/api/x/a3f8b2',
  riders: '/api/x/7c9d1e',
  zones: '/api/x/b5e4a1',
  player: '/api/x/d2c7f3',
  batch: '/api/x/f4c2d9',
  analytics: '/api/x/9b7e3a',
};

async function hmacSign(body: string): Promise<string> {
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

async function api(method: string, path: string, body?: unknown): Promise<unknown> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && refreshToken) {
    const r = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (r.ok) {
      token = ((await r.json()) as { token: string }).token;
      headers.Authorization = `Bearer ${token}`;
      res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    }
  }
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function signedPost(path: string, body: unknown): Promise<unknown> {
  const bodyStr = JSON.stringify(body);
  const sig = await hmacSign(bodyStr);
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Signature': sig,
    },
    body: bodyStr,
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function signedGet(path: string): Promise<unknown> {
  const sig = await hmacSign('');
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Signature': sig },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  // Auth still uses normal endpoints
  const username = `bot4_${Date.now()}`;
  const auth = (await api('POST', '/api/auth/register', {
    username,
    password: 'botpass123',
  })) as { token: string; refreshToken: string };
  token = auth.token;
  refreshToken = auth.refreshToken;
  console.log(`✅ Registered as ${username}`);

  for (let tick = 0; tick < 10; tick++) {
    // Use obfuscated paths — 120 req/min instead of 60
    const profile = (await api('GET', `${X.player}/profile`)) as { money: number; level: number };
    console.log(`💰 €${profile.money} | Lv.${profile.level}`);

    const pool = (await api('GET', `${X.riders}/pool`)) as { riders: { id: string }[] };
    if (pool.riders.length > 0) {
      try {
        await api('POST', `${X.riders}/hire`, { poolId: pool.riders[0].id });
      } catch {}
    }

    // Analytics via obfuscated path
    const demand = (await signedGet(`${X.analytics}/demand?hours=2`)) as {
      forecasts: { zone: string; demandLevel: number }[];
    };
    console.log(`📊 Zones: ${demand.forecasts.length}`);

    const riders = (await api('GET', X.riders)) as { id: string; status: string }[];
    const orders = (await api('GET', `${X.orders}/available`)) as { id: string; reward: number }[];
    const idle = riders.filter((r) => r.status === 'idle');
    const sorted = [...orders].sort((a, b) => b.reward - a.reward);

    const assignments = idle
      .map((rider) => {
        const o = sorted.shift();
        return o ? { riderId: rider.id, orderId: o.id } : null;
      })
      .filter(Boolean);

    if (assignments.length > 0) {
      const result = (await signedPost(`${X.batch}/assign`, { assignments })) as {
        results: unknown[];
      };
      console.log(`📦 Assigned ${result.results.length} via obfuscated batch`);
    }

    await new Promise((r) => setTimeout(r, 3000));
  }
  console.log('🏁 Done');
}

main().catch(console.error);
