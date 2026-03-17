/**
 * Stage 3 Bot — Data Edge
 * Uses analytics endpoints for data-driven assignment decisions.
 *
 * Usage: BASE_URL=http://localhost:5173 npx tsx docs/solutions/stage3/bot.ts
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

async function signedGet(path: string): Promise<unknown> {
  const sig = await hmacSign('');
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Signature': sig },
  });
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
  const username = `bot3_${Date.now()}`;
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

    // Hire from pool
    const pool = (await api('GET', '/api/riders/pool')) as { riders: { id: string }[] };
    if (pool.riders.length > 0) {
      try {
        await api('POST', '/api/riders/hire', { poolId: pool.riders[0].id });
      } catch {}
    }

    // Use analytics: demand forecast
    const demand = (await signedGet('/api/analytics/demand?hours=2')) as {
      forecasts: { zone: string; expectedOrders: number[]; demandLevel: number }[];
    };
    const hotZones = demand.forecasts
      .sort((a, b) => b.demandLevel - a.demandLevel)
      .map((f) => f.zone);
    console.log(`📊 Hot zones: ${hotZones.slice(0, 3).join(', ')}`);

    // Use analytics: rider efficiency
    const efficiency = (await signedGet('/api/analytics/riders')) as {
      stats: { riderId: string; successRate: number | null }[];
    };
    const riderRank = new Map(efficiency.stats.map((s) => [s.riderId, s.successRate ?? 0.5]));

    // Get orders and riders
    const riders = (await api('GET', '/api/riders')) as { id: string; status: string }[];
    const orders = (await api('GET', '/api/orders/available')) as {
      id: string;
      reward: number;
      urgency: string;
    }[];
    const idle = riders.filter((r) => r.status === 'idle');

    // Sort orders by urgency then reward, assign best riders (by success rate) first
    const sortedOrders = [...orders].sort((a, b) => {
      const urgencyScore = { express: 3, urgent: 2, normal: 1 } as Record<string, number>;
      return (urgencyScore[b.urgency] ?? 1) - (urgencyScore[a.urgency] ?? 1) || b.reward - a.reward;
    });
    const sortedRiders = [...idle].sort(
      (a, b) => (riderRank.get(b.id) ?? 0.5) - (riderRank.get(a.id) ?? 0.5),
    );

    const assignments = sortedRiders
      .map((rider) => {
        const order = sortedOrders.shift();
        return order ? { riderId: rider.id, orderId: order.id } : null;
      })
      .filter(Boolean);

    if (assignments.length > 0) {
      const result = (await signedPost('/api/batch/assign', { assignments })) as {
        results: unknown[];
      };
      console.log(`📦 Assigned ${result.results.length} (data-driven)`);
    }

    await new Promise((r) => setTimeout(r, 3000));
  }
  console.log('🏁 Done');
}

main().catch(console.error);
