/**
 * Stage 5 Bot — Rate & Wait
 * Uses pipeline super-batch + timing jitter to avoid detection.
 *
 * Usage: BASE_URL=http://localhost:5173 npx tsx docs/solutions/stage5/bot.ts
 */
const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const HMAC_KEY = 'dc-bulk-7f3a9e2b1d';
let token = '';
let refreshToken = '';

/** Random delay to avoid timing detection (stddev > 100ms required). */
const jitter = (base: number) => base + Math.random() * base * 0.5;

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

async function main() {
  const username = `bot5_${Date.now()}`;
  const auth = (await api('POST', '/api/auth/register', {
    username,
    password: 'botpass123',
  })) as { token: string; refreshToken: string };
  token = auth.token;
  refreshToken = auth.refreshToken;
  console.log(`✅ Registered as ${username}`);

  for (let tick = 0; tick < 10; tick++) {
    const profile = (await api('GET', '/api/player/profile')) as { money: number; level: number };
    console.log(`💰 €${profile.money} | Lv.${profile.level}`);

    const pool = (await api('GET', '/api/riders/pool')) as { riders: { id: string }[] };
    const riders = (await api('GET', '/api/riders')) as {
      id: string;
      status: string;
      speed: number;
    }[];
    const orders = (await api('GET', '/api/orders/available')) as { id: string; reward: number }[];
    const idle = riders.filter((r) => r.status === 'idle');
    const sorted = [...orders].sort((a, b) => b.reward - a.reward);

    // Build a pipeline of mixed actions in one request
    type Action =
      | { type: 'hire'; poolId: string }
      | { type: 'assign'; riderId: string; orderId: string }
      | { type: 'upgrade'; riderId: string; stat: string }
      | { type: 'rest'; riderId: string };
    const actions: Action[] = [];

    // Hire if possible
    if (pool.riders.length > 0) {
      actions.push({ type: 'hire', poolId: pool.riders[0].id });
    }

    // Assign all idle riders
    for (const rider of idle) {
      const order = sorted.shift();
      if (!order) break;
      actions.push({ type: 'assign', riderId: rider.id, orderId: order.id });
    }

    // Upgrade low-speed riders
    if (profile.level >= 5) {
      for (const r of riders.filter((r) => r.speed < 5).slice(0, 3)) {
        actions.push({ type: 'upgrade', riderId: r.id, stat: 'speed' });
      }
    }

    if (actions.length > 0) {
      try {
        const result = (await signedPost('/api/pipeline', { actions })) as {
          summary: { succeeded: number; failed: number };
        };
        console.log(`🔧 Pipeline: ${result.summary.succeeded} ok, ${result.summary.failed} err`);
      } catch (e) {
        console.log(`❌ Pipeline error: ${e}`);
      }
    }

    // Jittered delay — critical for avoiding timing detection
    await new Promise((r) => setTimeout(r, jitter(3000)));
  }
  console.log('🏁 Done');
}

main().catch(console.error);
