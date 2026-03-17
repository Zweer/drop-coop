import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { createClient, flattenZones, registerPlayer, type TestDb } from './e2e-helpers.ts';

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
const { orders, players, riders, zones } = await import('../src/models/index.ts');

afterAll(async () => {
  await closeDb?.();
});

const token = { value: '' };
let playerId: string;
let client: ReturnType<typeof createClient>;
const riderIds: string[] = [];
let zoneId: string;

describe('E2E: Phase 3 features', () => {
  it('setup: register and prepare player', async () => {
    const reg = await registerPlayer(app, 'phase3test', 'secret123', '10.0.0.1');
    token.value = reg.token;
    playerId = reg.playerId;
    client = createClient(app, token, '10.0.0.1');

    // Level up player for upgrades and contracts
    await testDb
      .update(players)
      .set({ level: 10, totalDeliveries: 30, reputation: 60, money: 50000, totalProfit: 5000 })
      .where(eq(players.id, playerId));

    // Trigger tick to seed zones
    await client.get('/api/player/profile');

    // Get zones
    const zRes = await client.get('/api/zones');
    const cities = (await zRes.json()) as { zones: Record<string, unknown>[] }[];
    const allZones = flattenZones(cities);
    zoneId = allZones[0].id as string;
  });

  // --- Achievements ---
  describe('Achievements', () => {
    it('GET /api/achievements returns all achievements', async () => {
      const res = await client.get('/api/achievements');
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>[];
      expect(body.length).toBe(22);
      expect(body[0]).toHaveProperty('id');
      expect(body[0]).toHaveProperty('name');
      expect(body[0]).toHaveProperty('icon');
      expect(body[0]).toHaveProperty('unlocked');
    });

    it('profile returns newAchievements', async () => {
      const res = await client.get('/api/player/profile');
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('newAchievements');
      expect(Array.isArray(body.newAchievements)).toBe(true);
    });
  });

  // --- Rider History ---
  describe('Rider History', () => {
    it('setup: hire a rider', async () => {
      const poolRes = await client.get('/api/riders/pool');
      const pool = ((await poolRes.json()) as { riders: Record<string, unknown>[] }).riders;
      const hireRes = await client.post('/api/riders/hire', { poolId: pool[0].id });
      const rider = (await hireRes.json()) as Record<string, unknown>;
      riderIds.push(rider.id as string);
    });

    it('GET /api/riders/:id/history returns stats', async () => {
      const res = await client.get(`/api/riders/${riderIds[0]}/history`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.riderId).toBe(riderIds[0]);
      expect(body).toHaveProperty('totalDelivered');
      expect(body).toHaveProperty('totalFailed');
      expect(body).toHaveProperty('successRate');
      expect(body).toHaveProperty('totalRevenue');
      expect(body).toHaveProperty('byZone');
    });

    it('returns 404 for unknown rider', async () => {
      const res = await client.get('/api/riders/00000000-0000-0000-0000-000000000000/history');
      expect(res.status).toBe(404);
    });

    it('returns delivery stats after completions', async () => {
      // Create a delivered order for this rider
      const now = new Date();
      await testDb.insert(orders).values({
        playerId,
        riderId: riderIds[0],
        zoneId,
        pickupLat: 45.464,
        pickupLng: 9.19,
        dropoffLat: 45.47,
        dropoffLng: 9.195,
        distance: 3,
        urgency: 'normal',
        reward: 12,
        status: 'delivered',
        expiresAt: now,
        assignedAt: now,
        deliveredAt: now,
      });

      const res = await client.get(`/api/riders/${riderIds[0]}/history`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.totalDelivered).toBeGreaterThan(0);
      expect(body.totalRevenue).toBeGreaterThan(0);
      expect(Number(body.successRate)).toBeGreaterThan(0);
      expect(Object.keys(body.byZone as object).length).toBeGreaterThan(0);
    });
  });

  // --- Treasury Breakdown ---
  describe('Treasury Breakdown', () => {
    it('setup: create completed orders for breakdown', async () => {
      const now = new Date();
      await testDb.insert(orders).values([
        {
          playerId,
          riderId: riderIds[0],
          zoneId,
          pickupLat: 45.464,
          pickupLng: 9.19,
          dropoffLat: 45.47,
          dropoffLng: 9.195,
          distance: 3,
          urgency: 'normal',
          reward: 15,
          status: 'delivered',
          expiresAt: now,
          assignedAt: now,
          deliveredAt: now,
        },
        {
          playerId,
          riderId: riderIds[0],
          zoneId,
          pickupLat: 45.464,
          pickupLng: 9.19,
          dropoffLat: 45.47,
          dropoffLng: 9.195,
          distance: 2,
          urgency: 'urgent',
          reward: 12,
          status: 'failed',
          expiresAt: now,
          assignedAt: now,
        },
        {
          playerId,
          zoneId,
          pickupLat: 45.464,
          pickupLng: 9.19,
          dropoffLat: 45.47,
          dropoffLng: 9.195,
          distance: 4,
          urgency: 'normal',
          reward: 10,
          status: 'expired',
          expiresAt: now,
        },
      ]);
    });

    it('GET /api/treasury/breakdown returns P&L with data', async () => {
      const res = await client.get('/api/treasury/breakdown');
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('totalRevenue');
      expect(body).toHaveProperty('totalDeliveries');
      expect(body).toHaveProperty('totalFailed');
      expect(body).toHaveProperty('totalExpired');
      expect(body).toHaveProperty('hourlyCosts');
      expect(body).toHaveProperty('revenueByZone');
      expect(body).toHaveProperty('revenueByRider');
      expect(Number(body.totalDeliveries)).toBeGreaterThan(0);
      expect(Number(body.totalFailed)).toBeGreaterThan(0);
      expect(Number(body.totalExpired)).toBeGreaterThan(0);
      expect((body.revenueByZone as unknown[]).length).toBeGreaterThan(0);
      expect((body.revenueByRider as unknown[]).length).toBeGreaterThan(0);
    });
  });

  // --- Snapshot ---
  describe('Snapshot', () => {
    it('GET /api/snapshot returns full game state', async () => {
      const res = await client.get('/api/snapshot');
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('player');
      expect(body).toHaveProperty('riders');
      expect(body).toHaveProperty('orders');
      expect(body).toHaveProperty('events');
      expect(body).toHaveProperty('zones');
      expect(body).toHaveProperty('achievements');
      expect(body).toHaveProperty('tick');
    });
  });

  // --- Contracts (hidden, HMAC) ---
  describe('Contracts', () => {
    it('POST /api/contracts/negotiate requires HMAC', async () => {
      const res = await client.post('/api/contracts/negotiate', { zoneId });
      expect(res.status).toBe(401);
    });

    it('rejects low reputation', async () => {
      await testDb.update(players).set({ reputation: 10 }).where(eq(players.id, playerId));
      const res = await client.signedPost('/api/contracts/negotiate', { zoneId });
      expect(res.status).toBe(403);
      await testDb.update(players).set({ reputation: 60 }).where(eq(players.id, playerId));
    });

    it('rejects unknown zone', async () => {
      const res = await client.signedPost('/api/contracts/negotiate', {
        zoneId: '00000000-0000-0000-0000-000000000000',
      });
      expect(res.status).toBe(404);
    });

    it('rejects unlocked zone not owned', async () => {
      // Insert a zone not owned by player
      const [fakeZone] = await testDb
        .insert(zones)
        .values({
          slug: 'fake-zone',
          name: 'Fake',
          city: 'milano',
          demandLevel: 3,
          trafficDensity: 5,
          hourlyFee: 10,
          unlockCost: 100,
        })
        .returning();
      const res = await client.signedPost('/api/contracts/negotiate', { zoneId: fakeZone.id });
      expect(res.status).toBe(403);
    });

    it('rejects not enough money', async () => {
      await testDb.update(players).set({ money: 0 }).where(eq(players.id, playerId));
      const res = await client.signedPost('/api/contracts/negotiate', { zoneId });
      expect(res.status).toBe(400);
      await testDb.update(players).set({ money: 50000 }).where(eq(players.id, playerId));
    });

    it('negotiates successfully', async () => {
      const res = await client.signedPost('/api/contracts/negotiate', { zoneId });
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('profit');
      expect(body).toHaveProperty('payout');
      expect(body).toHaveProperty('cost');
      expect(Number(body.profit)).toBeGreaterThan(0);
    });

    it('rejects invalid body', async () => {
      const res = await client.signedPost('/api/contracts/negotiate', { zoneId: 'not-uuid' });
      expect(res.status).toBe(400);
    });
  });

  // --- Coop ---
  describe('Coop', () => {
    it('GET /api/coop/policies returns policies', async () => {
      const res = await client.get('/api/coop/policies');
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('policies');
      expect(body).toHaveProperty('riderCount');
      expect(body).toHaveProperty('minRiders');
    });

    it('POST /api/coop/vote rejects with too few riders', async () => {
      const res = await client.post('/api/coop/vote', { policyType: 'pay_structure' });
      expect(res.status).toBe(400);
    });

    it('POST /api/coop/vote succeeds with enough riders', async () => {
      // Hire more riders to reach minimum (3)
      for (let i = 0; i < 2; i++) {
        const poolRes = await client.get('/api/riders/pool');
        const pool = ((await poolRes.json()) as { riders: Record<string, unknown>[] }).riders;
        if (pool.length > 0) {
          const hireRes = await client.post('/api/riders/hire', { poolId: pool[0].id });
          if (hireRes.status === 201) {
            const r = (await hireRes.json()) as Record<string, unknown>;
            riderIds.push(r.id as string);
          }
        }
      }

      const res = await client.post('/api/coop/vote', { policyType: 'pay_structure' });
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('policyType');
      expect(body).toHaveProperty('newOption');
      expect(body).toHaveProperty('votes');
    });

    it('POST /api/coop/vote updates existing policy', async () => {
      // Vote again on same policy — should update
      const res = await client.post('/api/coop/vote', { policyType: 'pay_structure' });
      expect(res.status).toBe(200);
    });

    it('rejects invalid policy type', async () => {
      const res = await client.post('/api/coop/vote', { policyType: 'invalid' });
      expect(res.status).toBe(400);
    });
  });

  // --- Market Insider (hidden, HMAC) ---
  describe('Market Insider', () => {
    it('requires HMAC', async () => {
      const res = await client.get('/api/market/insider');
      expect(res.status).toBe(401);
    });

    it('returns market intelligence', async () => {
      const res = await client.signedGet('/api/market/insider');
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('zones');
      expect(body).toHaveProperty('recommendation');
      expect(body).toHaveProperty('supplyDemandRatio');
    });
  });

  // --- Optimal Route (hidden, HMAC) ---
  describe('Optimal Route', () => {
    it('requires HMAC', async () => {
      const res = await client.get('/api/riders/optimal-route');
      expect(res.status).toBe(401);
    });

    it('returns route assignments', async () => {
      // Create some available orders first
      const now = new Date();
      await testDb.insert(orders).values([
        {
          playerId,
          zoneId,
          pickupLat: 45.464,
          pickupLng: 9.19,
          dropoffLat: 45.47,
          dropoffLng: 9.195,
          distance: 3,
          urgency: 'normal',
          reward: 10,
          expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
        },
      ]);

      const res = await client.signedGet('/api/riders/optimal-route');
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('assignments');
      expect(Array.isArray(body.assignments)).toBe(true);
    });
  });

  // --- Pipeline (stage 5, HMAC) ---
  describe('Pipeline', () => {
    it('requires HMAC', async () => {
      const res = await client.post('/api/pipeline', { actions: [] });
      expect(res.status).toBe(401);
    });

    it('rejects empty actions', async () => {
      const res = await client.signedPost('/api/pipeline', { actions: [] });
      expect(res.status).toBe(400);
    });

    it('handles rest action', async () => {
      const res = await client.signedPost('/api/pipeline', {
        actions: [{ type: 'rest', riderId: riderIds[0] }],
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        results: { ok: boolean }[];
        summary: Record<string, number>;
      };
      expect(body.summary.total).toBe(1);
      expect(body.results[0].ok).toBe(true);
      // Toggle back
      await client.signedPost('/api/pipeline', {
        actions: [{ type: 'rest', riderId: riderIds[0] }],
      });
    });

    it('handles assign action', async () => {
      // Create a fresh order
      const now = new Date();
      const [order] = await testDb
        .insert(orders)
        .values({
          playerId,
          zoneId,
          pickupLat: 45.464,
          pickupLng: 9.19,
          dropoffLat: 45.47,
          dropoffLng: 9.195,
          distance: 2,
          urgency: 'normal',
          reward: 8,
          expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
        })
        .returning();

      const res = await client.signedPost('/api/pipeline', {
        actions: [{ type: 'assign', riderId: riderIds[0], orderId: order.id }],
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { results: { ok: boolean; type: string }[] };
      expect(body.results[0].ok).toBe(true);
      expect(body.results[0].type).toBe('assign');

      // Reset rider to idle
      await testDb
        .update(riders)
        .set({ status: 'idle', energy: 100 })
        .where(eq(riders.id, riderIds[0]));
    });

    it('handles upgrade action', async () => {
      const res = await client.signedPost('/api/pipeline', {
        actions: [{ type: 'upgrade', riderId: riderIds[0], stat: 'speed' }],
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { results: { ok: boolean }[] };
      expect(body.results[0].ok).toBe(true);
    });

    it('handles hire action', async () => {
      const poolRes = await client.get('/api/riders/pool');
      const pool = ((await poolRes.json()) as { riders: Record<string, unknown>[] }).riders;
      if (pool.length > 0) {
        const res = await client.signedPost('/api/pipeline', {
          actions: [{ type: 'hire', poolId: pool[0].id }],
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { results: { ok: boolean }[] };
        expect(body.results[0].ok).toBe(true);
      }
    });

    it('handles failed actions gracefully', async () => {
      const res = await client.signedPost('/api/pipeline', {
        actions: [
          { type: 'rest', riderId: '00000000-0000-0000-0000-000000000000' },
          { type: 'assign', riderId: riderIds[0], orderId: '00000000-0000-0000-0000-000000000000' },
          { type: 'upgrade', riderId: '00000000-0000-0000-0000-000000000000', stat: 'speed' },
          { type: 'hire', poolId: '00000000-0000-0000-0000-000000000000' },
        ],
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        results: { ok: boolean }[];
        summary: Record<string, number>;
      };
      expect(body.summary.failed).toBe(4);
    });

    it('handles assign with tired rider', async () => {
      await testDb.update(riders).set({ energy: 0 }).where(eq(riders.id, riderIds[0]));
      const now = new Date();
      const [order] = await testDb
        .insert(orders)
        .values({
          playerId,
          zoneId,
          pickupLat: 45.464,
          pickupLng: 9.19,
          dropoffLat: 45.47,
          dropoffLng: 9.195,
          distance: 2,
          urgency: 'normal',
          reward: 8,
          expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
        })
        .returning();
      const res = await client.signedPost('/api/pipeline', {
        actions: [{ type: 'assign', riderId: riderIds[0], orderId: order.id }],
      });
      const body = (await res.json()) as { results: { ok: boolean; error?: string }[] };
      expect(body.results[0].ok).toBe(false);
      expect(body.results[0].error).toContain('tired');
      await testDb.update(riders).set({ energy: 100 }).where(eq(riders.id, riderIds[0]));
    });

    it('handles upgrade with maxed stat', async () => {
      await testDb.update(riders).set({ speed: 10 }).where(eq(riders.id, riderIds[0]));
      const res = await client.signedPost('/api/pipeline', {
        actions: [{ type: 'upgrade', riderId: riderIds[0], stat: 'speed' }],
      });
      const body = (await res.json()) as { results: { ok: boolean; error?: string }[] };
      expect(body.results[0].ok).toBe(false);
      expect(body.results[0].error).toContain('maxed');
    });

    it('handles upgrade with not enough money', async () => {
      await testDb.update(players).set({ money: 0 }).where(eq(players.id, playerId));
      await testDb.update(riders).set({ speed: 5 }).where(eq(riders.id, riderIds[0]));
      const res = await client.signedPost('/api/pipeline', {
        actions: [{ type: 'upgrade', riderId: riderIds[0], stat: 'speed' }],
      });
      const body = (await res.json()) as { results: { ok: boolean; error?: string }[] };
      expect(body.results[0].ok).toBe(false);
      expect(body.results[0].error).toContain('money');
      await testDb.update(players).set({ money: 50000 }).where(eq(players.id, playerId));
    });

    it('handles upgrade with low level', async () => {
      await testDb.update(players).set({ level: 1 }).where(eq(players.id, playerId));
      const res = await client.signedPost('/api/pipeline', {
        actions: [{ type: 'upgrade', riderId: riderIds[0], stat: 'speed' }],
      });
      const body = (await res.json()) as { results: { ok: boolean; error?: string }[] };
      expect(body.results[0].ok).toBe(false);
      expect(body.results[0].error).toContain('level');
      await testDb.update(players).set({ level: 10 }).where(eq(players.id, playerId));
    });

    it('handles hire with not enough money', async () => {
      const poolRes = await client.get('/api/riders/pool');
      const pool = ((await poolRes.json()) as { riders: Record<string, unknown>[] }).riders;
      if (pool.length > 0) {
        await testDb.update(players).set({ money: 0 }).where(eq(players.id, playerId));
        const res = await client.signedPost('/api/pipeline', {
          actions: [{ type: 'hire', poolId: pool[0].id }],
        });
        const body = (await res.json()) as { results: { ok: boolean; error?: string }[] };
        expect(body.results[0].ok).toBe(false);
        expect(body.results[0].error).toContain('money');
        await testDb.update(players).set({ money: 50000 }).where(eq(players.id, playerId));
      }
    });

    it('handles rest on delivering rider', async () => {
      await testDb.update(riders).set({ status: 'delivering' }).where(eq(riders.id, riderIds[0]));
      const res = await client.signedPost('/api/pipeline', {
        actions: [{ type: 'rest', riderId: riderIds[0] }],
      });
      const body = (await res.json()) as { results: { ok: boolean; error?: string }[] };
      expect(body.results[0].ok).toBe(false);
      expect(body.results[0].error).toContain('delivering');
      await testDb.update(riders).set({ status: 'idle' }).where(eq(riders.id, riderIds[0]));
    });
  });
});
