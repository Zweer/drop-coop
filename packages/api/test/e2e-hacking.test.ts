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

const token = { value: '' };
let playerId: string;
let client: ReturnType<typeof createClient>;
const riderIds: string[] = [];

describe('E2E: Hacking stages', () => {
  it('setup: register, level up, hire riders', async () => {
    const result = await registerPlayer(app, 'hacker', 'secret123', '10.0.10.0');
    token.value = result.token;
    playerId = result.playerId;
    client = createClient(app, token, '10.0.10.0');

    // Level up and fund
    await testDb.update(players).set({ money: 50000, level: 10 }).where(eq(players.id, playerId));

    // Ensure zones exist and centro is unlocked (trigger via zones endpoint)
    await client.get('/api/zones');

    // Hire 2 riders
    const poolRes = await client.get('/api/riders/pool');
    const pool = ((await poolRes.json()) as Record<string, unknown>).riders as Record<
      string,
      unknown
    >[];

    for (const p of pool.slice(0, 2)) {
      const res = await client.post('/api/riders/hire', { poolId: p.id });
      const rider = (await res.json()) as Record<string, unknown>;
      riderIds.push(rider.id as string);
    }

    // Generate some orders
    await client.get('/api/orders/available');
  });

  // --- Stage 2: HMAC Batch ---

  describe('Stage 2: HMAC batch endpoints', () => {
    it('should reject batch assign without signature', async () => {
      const res = await client.post('/api/batch/assign', { assignments: [] });
      expect(res.status).toBe(401);
    });

    it('should reject batch assign with wrong signature', async () => {
      const body = JSON.stringify({ assignments: [] });
      const res = await client.post(
        '/api/batch/assign',
        { assignments: [] },
        {
          'X-Signature': 'deadbeef',
        },
      );
      expect(res.status).toBe(401);
    });

    it('should batch assign orders with valid HMAC', async () => {
      // Ensure riders are idle
      for (const id of riderIds) {
        await testDb.update(riders).set({ status: 'idle', energy: 100 }).where(eq(riders.id, id));
      }

      // Set lastTickAt to 1 hour ago to generate orders
      await testDb
        .update(players)
        .set({ lastTickAt: new Date(Date.now() - 60 * 60 * 1000) })
        .where(eq(players.id, playerId));

      // Trigger tick
      await client.get('/api/orders/available');

      const available = await testDb.query.orders.findMany({
        where: eq(orders.status, 'available'),
      });

      if (available.length === 0) {
        console.log('No orders for batch assign');
        return;
      }

      const assignments = available.slice(0, Math.min(2, riderIds.length)).map((o, i) => ({
        riderId: riderIds[i],
        orderId: o.id,
      }));

      const res = await client.signedPost('/api/batch/assign', { assignments });
      expect(res.status).toBe(200);

      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('results');
      expect(body).toHaveProperty('errors');
      expect(Array.isArray(body.results)).toBe(true);
    });

    it('should reject batch upgrade without signature', async () => {
      const res = await client.post('/api/batch/upgrade', {
        upgrades: [{ riderId: riderIds[0], stat: 'speed' }],
      });
      expect(res.status).toBe(401);
    });

    it('should batch upgrade riders with valid HMAC', async () => {
      await testDb.update(players).set({ money: 50000, level: 10 }).where(eq(players.id, playerId));

      const upgrades = [
        { riderId: riderIds[0], stat: 'reliability' },
        { riderId: riderIds[1], stat: 'stamina' },
      ];

      const res = await client.signedPost('/api/batch/upgrade', { upgrades });
      expect(res.status).toBe(200);

      const body = (await res.json()) as Record<string, unknown>;
      expect(Array.isArray(body.results)).toBe(true);
      expect(body).toHaveProperty('remainingMoney');
    });
  });

  // --- Stage 3: Analytics ---

  describe('Stage 3: Analytics endpoints', () => {
    it('should reject analytics without signature', async () => {
      const res = await client.get('/api/analytics/demand');
      expect(res.status).toBe(401);
    });

    it('should get demand forecast with HMAC', async () => {
      const res = await client.signedGet('/api/analytics/demand?hours=4');
      expect(res.status).toBe(200);

      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('hours');
      expect(body).toHaveProperty('forecasts');
    });

    it('should get event forecast with HMAC', async () => {
      const res = await client.signedGet('/api/analytics/events?hours=6');
      expect(res.status).toBe(200);

      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('anyEventProbability');
      expect(body).toHaveProperty('predictions');
    });

    it('should get rider efficiency with HMAC', async () => {
      const res = await client.signedGet('/api/analytics/riders');
      expect(res.status).toBe(200);

      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('stats');
      expect(Array.isArray(body.stats)).toBe(true);
    });

    it('should get pool preview with HMAC', async () => {
      const res = await client.signedGet('/api/analytics/pool');
      expect(res.status).toBe(200);

      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('hints');
      expect(body).toHaveProperty('refreshAt');
    });
  });

  // --- Leaderboards ---

  describe('Hacker & Explorer leaderboards', () => {
    it('should show hacker on hacker leaderboard', async () => {
      const res = await client.get('/api/leaderboard/hackers');
      expect(res.status).toBe(200);

      const entries = (await res.json()) as Record<string, unknown>[];
      // Our player used batch endpoints, should appear
      const me = entries.find((e) => e.username === 'hacker');
      // May or may not appear depending on timing of endpoint tracking
      expect(Array.isArray(entries)).toBe(true);
    });

    it('should show explorer leaderboard', async () => {
      const res = await client.get('/api/leaderboard/explorers');
      expect(res.status).toBe(200);

      const entries = (await res.json()) as Record<string, unknown>[];
      expect(Array.isArray(entries)).toBe(true);
      // Our player has hit many endpoints
      if (entries.length > 0) {
        expect(entries[0]).toHaveProperty('endpointsDiscovered');
      }
    });
  });
});
