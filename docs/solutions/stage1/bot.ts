/**
 * Stage 1 Bot — Plain Sight
 * Discovers the REST API, handles JWT auth + refresh.
 *
 * Usage: BASE_URL=http://localhost:5173 npx tsx docs/solutions/stage1/bot.ts
 */
const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
let token = '';
let refreshToken = '';

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

async function main() {
  const username = `bot1_${Date.now()}`;
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
    if (pool.riders.length > 0) {
      try {
        await api('POST', '/api/riders/hire', { poolId: pool.riders[0].id });
      } catch {}
    }

    const riders = (await api('GET', '/api/riders')) as { id: string; status: string }[];
    const orders = (await api('GET', '/api/orders/available')) as { id: string; reward: number }[];
    const idle = riders.filter((r) => r.status === 'idle');
    const sorted = [...orders].sort((a, b) => b.reward - a.reward);

    for (const rider of idle) {
      const order = sorted.shift();
      if (!order) break;
      try {
        await api('POST', '/api/orders/assign', { riderId: rider.id, orderId: order.id });
      } catch {}
    }

    await new Promise((r) => setTimeout(r, 3000));
  }
  console.log('🏁 Done');
}

main().catch(console.error);
