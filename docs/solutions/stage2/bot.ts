/**
 * Stage 2 Bot — Signed & Sealed
 * Adds HMAC signing + batch assign / bulk upgrade.
 *
 * Usage: BASE_URL=http://localhost:5173 npx tsx docs/solutions/stage2/bot.ts
 */
const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const HMAC_KEY = 'dc-bulk-7f3a9e2b1d';
let token = '';
let refreshToken = '';

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
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Signature': sig,
  };
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: bodyStr });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  const username = `bot2_${Date.now()}`;
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

    // Hire
    const pool = (await api('GET', '/api/riders/pool')) as { riders: { id: string }[] };
    if (pool.riders.length > 0) {
      try {
        await api('POST', '/api/riders/hire', { poolId: pool.riders[0].id });
      } catch {}
    }

    const riders = (await api('GET', '/api/riders')) as {
      id: string;
      status: string;
      speed: number;
    }[];
    const orders = (await api('GET', '/api/orders/available')) as { id: string; reward: number }[];
    const idle = riders.filter((r) => r.status === 'idle');
    const sorted = [...orders].sort((a, b) => b.reward - a.reward);

    // Batch assign — one request for all assignments
    const assignments = idle
      .map((rider) => {
        const order = sorted.shift();
        return order ? { riderId: rider.id, orderId: order.id } : null;
      })
      .filter(Boolean);

    if (assignments.length > 0) {
      try {
        const result = (await signedPost('/api/batch/assign', { assignments })) as {
          results: unknown[];
          errors: unknown[];
        };
        console.log(`📦 Batch: ${result.results.length} assigned, ${result.errors.length} errors`);
      } catch {}
    }

    // Bulk upgrade low-stat riders
    if (profile.level >= 5) {
      const upgrades = riders
        .filter((r) => r.speed < 5)
        .slice(0, 3)
        .map((r) => ({ riderId: r.id, stat: 'speed' as const }));
      if (upgrades.length > 0) {
        try {
          await signedPost('/api/batch/upgrade', { upgrades });
        } catch {}
      }
    }

    await new Promise((r) => setTimeout(r, 3000));
  }
  console.log('🏁 Done');
}

main().catch(console.error);
