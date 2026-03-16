import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it, vi } from 'vitest';

import {
  createClient,
  createTestDb,
  hmacSign,
  registerPlayer,
  type TestDb,
} from './e2e-helpers.ts';

let testDb: TestDb;
let closeDb: () => Promise<void>;

vi.mock('../src/db/index.ts', async () => {
  const { createTestDb } = await import('./e2e-helpers.ts');
  const result = await createTestDb();
  testDb = result.db;
  closeDb = result.close;
  return { db: result.db };
});

const { app } = await import('../src/app.ts');
const { orders, players, riders } = await import('../src/models/index.ts');

afterAll(async () => {
  await closeDb?.();
});

// --- Input Validation ---

describe('Input validation', () => {
  let client: ReturnType<typeof createClient>;
  const token = { value: '' };
  const IP = '10.0.40.0';

  it('setup', async () => {
    const result = await registerPlayer(app, 'valtest', 'secret123', IP);
    token.value = result.token;
    client = createClient(app, token, IP);
  });

  it('should reject register with long username (>20)', async () => {
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.40.1' },
      body: JSON.stringify({ username: 'a'.repeat(21), password: 'secret123' }),
    });
    expect(res.status).toBe(400);
  });

  it('should reject login with missing fields', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.40.2' },
      body: JSON.stringify({ username: 'valtest' }),
    });
    expect(res.status).toBe(400);
  });

  it('should reject refresh with missing body', async () => {
    const res = await app.request('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.40.3' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('should reject assign with non-UUID ids', async () => {
    const res = await client.post('/api/orders/assign', {
      riderId: 'not-uuid',
      orderId: 'not-uuid',
    });
    expect(res.status).toBe(400);
  });

  it('should reject assign with missing body', async () => {
    const res = await client.post('/api/orders/assign', {});
    expect(res.status).toBe(400);
  });

  it('should reject zone unlock with non-UUID', async () => {
    const res = await client.post('/api/zones/unlock', { zoneId: 'not-a-uuid' });
    expect(res.status).toBe(400);
  });

  it('should reject zone unlock with missing body', async () => {
    const res = await client.post('/api/zones/unlock', {});
    expect(res.status).toBe(400);
  });

  it('should reject hire with non-UUID poolId', async () => {
    const res = await client.post('/api/riders/hire', { poolId: 'bad' });
    expect(res.status).toBe(400);
  });

  it('should reject upgrade with missing stat', async () => {
    const res = await client.post('/api/riders/00000000-0000-0000-0000-000000000001/upgrade', {});
    expect(res.status).toBe(400);
  });
});

// --- Rider edge cases ---

describe('Rider edge cases', () => {
  let client: ReturnType<typeof createClient>;
  let playerId: string;
  const token = { value: '' };
  const IP = '10.0.41.0';

  it('setup', async () => {
    const result = await registerPlayer(app, 'riderec', 'secret123', IP);
    token.value = result.token;
    playerId = result.playerId;
    client = createClient(app, token, IP);
    await testDb.update(players).set({ money: 50000, level: 10 }).where(eq(players.id, playerId));
  });

  it('should reject rest on nonexistent rider', async () => {
    const res = await client.post('/api/riders/00000000-0000-0000-0000-000000000099/rest', {});
    expect(res.status).toBe(404);
  });

  it('should remove hired rider from pool', async () => {
    const poolRes1 = await client.get('/api/riders/pool');
    const pool1 = ((await poolRes1.json()) as Record<string, unknown>).riders as Record<
      string,
      unknown
    >[];
    expect(pool1.length).toBe(4);

    await client.post('/api/riders/hire', { poolId: pool1[0].id });

    const poolRes2 = await client.get('/api/riders/pool');
    const pool2 = ((await poolRes2.json()) as Record<string, unknown>).riders as Record<
      string,
      unknown
    >[];
    expect(pool2.length).toBe(3);

    // The hired rider's ID should not be in pool anymore
    const ids2 = pool2.map((r) => r.id);
    expect(ids2).not.toContain(pool1[0].id);
  });

  it('should not allow hiring same pool rider twice', async () => {
    const poolRes = await client.get('/api/riders/pool');
    const pool = ((await poolRes.json()) as Record<string, unknown>).riders as Record<
      string,
      unknown
    >[];

    await client.post('/api/riders/hire', { poolId: pool[0].id });

    // Try again with same ID
    const res = await client.post('/api/riders/hire', { poolId: pool[0].id });
    expect(res.status).toBe(404);
  });
});

// --- Batch edge cases ---

describe('Batch edge cases', () => {
  let client: ReturnType<typeof createClient>;
  let playerId: string;
  const riderIds: string[] = [];
  const token = { value: '' };
  const IP = '10.0.42.0';

  it('setup: register, hire riders', async () => {
    const result = await registerPlayer(app, 'batchec', 'secret123', IP);
    token.value = result.token;
    playerId = result.playerId;
    client = createClient(app, token, IP);

    await testDb.update(players).set({ money: 50000, level: 10 }).where(eq(players.id, playerId));
    await client.get('/api/zones');

    const poolRes = await client.get('/api/riders/pool');
    const pool = ((await poolRes.json()) as Record<string, unknown>).riders as Record<
      string,
      unknown
    >[];
    for (const p of pool.slice(0, 2)) {
      const res = await client.post('/api/riders/hire', { poolId: p.id });
      riderIds.push(((await res.json()) as Record<string, unknown>).id as string);
    }
  });

  it('should reject batch assign with empty array', async () => {
    const body = JSON.stringify({ assignments: [] });
    const sig = await hmacSign(body);
    const res = await app.request('/api/batch/assign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
        'X-Signature': sig,
        'X-Forwarded-For': IP,
      },
      body,
    });
    expect(res.status).toBe(400);
  });

  it('should reject batch upgrade with empty array', async () => {
    const body = JSON.stringify({ upgrades: [] });
    const sig = await hmacSign(body);
    const res = await app.request('/api/batch/upgrade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`,
        'X-Signature': sig,
        'X-Forwarded-For': IP,
      },
      body,
    });
    expect(res.status).toBe(400);
  });

  it('should reject batch upgrade when level too low', async () => {
    await testDb.update(players).set({ level: 1 }).where(eq(players.id, playerId));

    const res = await client.signedPost('/api/batch/upgrade', {
      upgrades: [{ riderId: riderIds[0], stat: 'speed' }],
    });
    expect(res.status).toBe(403);

    await testDb.update(players).set({ level: 10 }).where(eq(players.id, playerId));
  });

  it('should handle batch upgrade with mixed valid/invalid riders', async () => {
    await testDb.update(players).set({ money: 50000 }).where(eq(players.id, playerId));

    const res = await client.signedPost('/api/batch/upgrade', {
      upgrades: [
        { riderId: riderIds[0], stat: 'speed' },
        { riderId: '00000000-0000-0000-0000-000000000099', stat: 'speed' },
      ],
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    const results = body.results as unknown[];
    const errors = body.errors as unknown[];
    expect(results.length).toBe(1);
    expect(errors.length).toBe(1);
  });

  it('should handle batch assign with mixed valid/invalid', async () => {
    // Reset riders
    for (const id of riderIds) {
      await testDb.update(riders).set({ status: 'idle', energy: 100 }).where(eq(riders.id, id));
    }

    // Generate orders
    await testDb
      .update(players)
      .set({ lastTickAt: new Date(Date.now() - 60 * 60 * 1000) })
      .where(eq(players.id, playerId));
    await client.get('/api/orders/available');

    const available = await testDb.query.orders.findMany({ where: eq(orders.status, 'available') });

    if (available.length > 0) {
      const res = await client.signedPost('/api/batch/assign', {
        assignments: [
          { riderId: riderIds[0], orderId: available[0].id },
          { riderId: '00000000-0000-0000-0000-000000000099', orderId: available[0].id },
        ],
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('results');
      expect(body).toHaveProperty('errors');
    }
  });

  it('should reject batch upgrade with invalid stat', async () => {
    const res = await client.signedPost('/api/batch/upgrade', {
      upgrades: [{ riderId: riderIds[0], stat: 'charisma' }],
    });
    expect(res.status).toBe(400);
  });

  it('should handle batch upgrade with maxed stat', async () => {
    await testDb.update(riders).set({ speed: 10 }).where(eq(riders.id, riderIds[0]));
    await testDb.update(players).set({ money: 50000, level: 10 }).where(eq(players.id, playerId));

    const res = await client.signedPost('/api/batch/upgrade', {
      upgrades: [{ riderId: riderIds[0], stat: 'speed' }],
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    expect((body.errors as unknown[]).length).toBe(1);
  });

  it('should deduct correct money for batch upgrades', async () => {
    await testDb.update(riders).set({ speed: 3, reliability: 3 }).where(eq(riders.id, riderIds[0]));
    await testDb.update(players).set({ money: 50000, level: 10 }).where(eq(players.id, playerId));

    const res = await client.signedPost('/api/batch/upgrade', {
      upgrades: [
        { riderId: riderIds[0], stat: 'speed' },
        { riderId: riderIds[0], stat: 'reliability' },
      ],
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    expect(typeof body.remainingMoney).toBe('number');
    expect(Number(body.remainingMoney)).toBeLessThan(50000);
  });
});

// --- Multi-player leaderboard ---

describe('Multi-player leaderboard', () => {
  const players_data: {
    client: ReturnType<typeof createClient>;
    playerId: string;
    token: { value: string };
  }[] = [];

  it('setup: register 3 players with different profits', async () => {
    for (let i = 0; i < 3; i++) {
      const t = { value: '' };
      const result = await registerPlayer(app, `leader${i}`, 'secret123', `10.0.50.${i}`);
      t.value = result.token;
      const c = createClient(app, t, `10.0.50.${i}`);
      players_data.push({ client: c, playerId: result.playerId, token: t });
    }

    // Set different profits
    await testDb
      .update(players)
      .set({ totalProfit: 1000 })
      .where(eq(players.id, players_data[0].playerId));
    await testDb
      .update(players)
      .set({ totalProfit: 5000 })
      .where(eq(players.id, players_data[1].playerId));
    await testDb
      .update(players)
      .set({ totalProfit: 3000 })
      .where(eq(players.id, players_data[2].playerId));
  });

  it('should rank players by totalProfit descending', async () => {
    const res = await players_data[0].client.get('/api/leaderboard');
    expect(res.status).toBe(200);

    const entries = (await res.json()) as Record<string, unknown>[];
    const leaderNames = entries.filter((e) =>
      ['leader0', 'leader1', 'leader2'].includes(e.username as string),
    );

    expect(leaderNames.length).toBe(3);
    // leader1 (5000) should be first among them
    const idx1 = leaderNames.findIndex((e) => e.username === 'leader1');
    const idx0 = leaderNames.findIndex((e) => e.username === 'leader0');
    expect(idx1).toBeLessThan(idx0);
  });

  it('leaderboard entries should have rank, username, totalProfit, level, totalDeliveries', async () => {
    const res = await players_data[0].client.get('/api/leaderboard');
    const entries = (await res.json()) as Record<string, unknown>[];

    expect(entries.length).toBeGreaterThan(0);
    const entry = entries[0];
    expect(entry).toHaveProperty('rank');
    expect(entry).toHaveProperty('username');
    expect(entry).toHaveProperty('totalProfit');
    expect(entry).toHaveProperty('level');
    expect(entry).toHaveProperty('totalDeliveries');
  });
});

// --- Rate limiting ---

describe('Rate limiting', () => {
  it('should rate limit auth endpoints (5 per 15 min)', async () => {
    const IP = '10.0.60.0';
    // 5 requests should be fine, 6th should be 429
    for (let i = 0; i < 5; i++) {
      await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': IP },
        body: JSON.stringify({ username: `noexist${i}`, password: 'secret123' }),
      });
    }

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': IP },
      body: JSON.stringify({ username: 'noexist99', password: 'secret123' }),
    });
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
  });

  it('should rate limit general API endpoints (60 per min)', async () => {
    const IP = '10.0.61.0';
    const result = await registerPlayer(app, 'ratelim', 'secret123', '10.0.61.1');
    const t = { value: result.token };
    const c = createClient(app, t, IP);

    // Fire 60 requests
    const promises = [];
    for (let i = 0; i < 60; i++) {
      promises.push(c.get('/api/events'));
    }
    await Promise.all(promises);

    // 61st should be rate limited
    const res = await c.get('/api/events');
    expect(res.status).toBe(429);
  });
});

// --- Analytics edge cases ---

describe('Analytics edge cases', () => {
  let client: ReturnType<typeof createClient>;
  let playerId: string;
  const token = { value: '' };
  const IP = '10.0.43.0';

  it('setup', async () => {
    const result = await registerPlayer(app, 'analec', 'secret123', IP);
    token.value = result.token;
    playerId = result.playerId;
    client = createClient(app, token, IP);
  });

  it('should return empty forecasts when no zones unlocked', async () => {
    // Don't call /api/zones (no starter zone)
    const res = await client.signedGet('/api/analytics/demand?hours=4');
    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.hours).toBe(4);
    expect((body.forecasts as unknown[]).length).toBe(0);
  });

  it('should clamp hours to 1-12', async () => {
    await client.get('/api/zones'); // init zones

    const res1 = await client.signedGet('/api/analytics/demand?hours=0');
    expect(res1.status).toBe(200);
    expect(((await res1.json()) as Record<string, unknown>).hours).toBe(1);

    const res2 = await client.signedGet('/api/analytics/demand?hours=99');
    expect(res2.status).toBe(200);
    expect(((await res2.json()) as Record<string, unknown>).hours).toBe(12);
  });

  it('should return rider stats with no delivery history', async () => {
    const res = await client.signedGet('/api/analytics/riders');
    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    const stats = body.stats as Record<string, unknown>[];
    // No riders hired, so empty
    expect(stats.length).toBe(0);
  });

  it('should return pool preview with hints', async () => {
    const res = await client.signedGet('/api/analytics/pool');
    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    const hints = body.hints as Record<string, unknown>[];
    // Pool preview shows 3 of 4 riders
    expect(hints.length).toBe(3);
    expect(body.hiddenCount).toBe(1);

    // Each hint should have stats
    for (const hint of hints) {
      expect(hint).toHaveProperty('name');
      expect(hint).toHaveProperty('speed');
      expect(hint).toHaveProperty('reliability');
      expect(hint).toHaveProperty('estimatedCost');
    }
  });

  it('should return event predictions', async () => {
    const res = await client.signedGet('/api/analytics/events?hours=6');
    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty('anyEventProbability');
    const preds = body.predictions as Record<string, unknown>[];
    expect(preds.length).toBeGreaterThan(0);

    for (const pred of preds) {
      expect(pred).toHaveProperty('type');
      expect(pred).toHaveProperty('probability');
      expect(Number(pred.probability)).toBeGreaterThanOrEqual(0);
      expect(Number(pred.probability)).toBeLessThanOrEqual(1);
    }
  });
});
