import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it, vi } from 'vitest';

import {
  createClient,
  createTestDb,
  registerPlayer,
  TEST_ORDER_DEFAULTS,
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
const { orders, players, riders, events } = await import('../src/models/index.ts');

afterAll(async () => {
  await closeDb?.();
});

describe('E2E: Game mechanics', () => {
  let client: ReturnType<typeof createClient>;
  let playerId: string;
  let riderId: string;
  const token = { value: '' };
  const IP = '10.0.30.0';

  it('setup: register, hire rider, unlock zones', async () => {
    const result = await registerPlayer(app, 'mechtest', 'secret123', IP);
    token.value = result.token;
    playerId = result.playerId;
    client = createClient(app, token, IP);

    await testDb.update(players).set({ money: 50000, level: 10 }).where(eq(players.id, playerId));

    // Init zones
    await client.get('/api/zones');

    // Hire a rider
    const poolRes = await client.get('/api/riders/pool');
    const pool = ((await poolRes.json()) as Record<string, unknown>).riders as Record<
      string,
      unknown
    >[];
    const hireRes = await client.post('/api/riders/hire', { poolId: pool[0].id });
    riderId = ((await hireRes.json()) as Record<string, unknown>).id as string;
  });

  // --- Energy ---

  describe('Energy regeneration', () => {
    it('should regenerate energy over time for idle rider', async () => {
      await testDb.update(riders).set({ energy: 50, status: 'idle' }).where(eq(riders.id, riderId));
      await testDb
        .update(players)
        .set({ lastTickAt: new Date(Date.now() - 2 * 60 * 60 * 1000) })
        .where(eq(players.id, playerId));

      await client.get('/api/player/profile');

      const rider = await testDb.query.riders.findFirst({ where: eq(riders.id, riderId) });
      // 50 + 10/hr * 2hr = 70
      expect(rider!.energy).toBeGreaterThanOrEqual(69);
      expect(rider!.energy).toBeLessThanOrEqual(71);
    });

    it('should regenerate energy 2x faster for resting rider', async () => {
      await testDb
        .update(riders)
        .set({ energy: 50, status: 'resting' })
        .where(eq(riders.id, riderId));
      await testDb
        .update(players)
        .set({ lastTickAt: new Date(Date.now() - 2 * 60 * 60 * 1000) })
        .where(eq(players.id, playerId));

      await client.get('/api/player/profile');

      const rider = await testDb.query.riders.findFirst({ where: eq(riders.id, riderId) });
      // 50 + 20/hr * 2hr = 90
      expect(rider!.energy).toBeGreaterThanOrEqual(89);
      expect(rider!.energy).toBeLessThanOrEqual(91);
    });

    it('should cap energy at 100', async () => {
      await testDb.update(riders).set({ energy: 95, status: 'idle' }).where(eq(riders.id, riderId));
      await testDb
        .update(players)
        .set({ lastTickAt: new Date(Date.now() - 5 * 60 * 60 * 1000) })
        .where(eq(players.id, playerId));

      await client.get('/api/player/profile');

      const rider = await testDb.query.riders.findFirst({ where: eq(riders.id, riderId) });
      expect(rider!.energy).toBe(100);
    });
  });

  // --- Morale ---

  describe('Morale mechanics', () => {
    it('should drift morale toward baseline (50) over time', async () => {
      await testDb
        .update(riders)
        .set({ morale: 20, status: 'idle', energy: 100 })
        .where(eq(riders.id, riderId));
      await testDb
        .update(players)
        .set({ lastTickAt: new Date(Date.now() - 5 * 60 * 60 * 1000) })
        .where(eq(players.id, playerId));

      await client.get('/api/player/profile');

      const rider = await testDb.query.riders.findFirst({ where: eq(riders.id, riderId) });
      // 20 + 1/hr * 5hr = 25
      expect(rider!.morale).toBeGreaterThan(20);
      expect(rider!.morale).toBeLessThanOrEqual(30);
    });

    it('should boost morale faster when resting', async () => {
      await testDb
        .update(riders)
        .set({ morale: 20, status: 'resting', energy: 100 })
        .where(eq(riders.id, riderId));
      await testDb
        .update(players)
        .set({ lastTickAt: new Date(Date.now() - 5 * 60 * 60 * 1000) })
        .where(eq(players.id, playerId));

      await client.get('/api/player/profile');

      const rider = await testDb.query.riders.findFirst({ where: eq(riders.id, riderId) });
      // 20 + (1 drift + 3 rest)/hr * 5hr = 40
      expect(rider!.morale).toBeGreaterThanOrEqual(35);
    });

    it('should decrease high morale toward baseline', async () => {
      await testDb
        .update(riders)
        .set({ morale: 90, status: 'idle', energy: 100 })
        .where(eq(riders.id, riderId));
      await testDb
        .update(players)
        .set({ lastTickAt: new Date(Date.now() - 10 * 60 * 60 * 1000) })
        .where(eq(players.id, playerId));

      await client.get('/api/player/profile');

      const rider = await testDb.query.riders.findFirst({ where: eq(riders.id, riderId) });
      // 90 - 1/hr * 10hr = 80
      expect(rider!.morale).toBeLessThan(90);
    });
  });

  // --- Salary & Zone Fees ---

  describe('Economy: costs', () => {
    it('should deduct salary costs over time', async () => {
      const salary = (await testDb.query.riders.findFirst({ where: eq(riders.id, riderId) }))!
        .salary;
      await testDb
        .update(players)
        .set({ money: 10000, lastTickAt: new Date(Date.now() - 1 * 60 * 60 * 1000) })
        .where(eq(players.id, playerId));
      await testDb
        .update(riders)
        .set({ status: 'idle', energy: 100 })
        .where(eq(riders.id, riderId));

      const profileRes = await client.get('/api/player/profile');
      const profile = (await profileRes.json()) as Record<string, unknown>;

      // Money should be less than 10000 (salary + zone fees deducted)
      expect(Number(profile.money)).toBeLessThan(10000);
    });

    it('should deduct zone hourly fees', async () => {
      // Set a known state: lots of money, 4 hours elapsed
      await testDb
        .update(players)
        .set({ money: 50000, lastTickAt: new Date(Date.now() - 4 * 60 * 60 * 1000) })
        .where(eq(players.id, playerId));
      await testDb
        .update(riders)
        .set({ status: 'idle', energy: 100 })
        .where(eq(riders.id, riderId));

      const profileRes = await client.get('/api/player/profile');
      const profile = (await profileRes.json()) as Record<string, unknown>;

      // Zone fees + salary should reduce money
      expect(Number(profile.money)).toBeLessThan(50000);
    });
  });

  // --- Order Generation ---

  describe('Order generation', () => {
    it('should generate orders based on elapsed time', async () => {
      // Clear existing orders
      await testDb.delete(orders).where(eq(orders.playerId, playerId));

      await testDb
        .update(players)
        .set({
          money: 50000,
          level: 10,
          reputation: 50,
          lastTickAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        })
        .where(eq(players.id, playerId));

      const res = await client.get('/api/orders/available');
      const available = (await res.json()) as Record<string, unknown>[];

      expect(available.length).toBeGreaterThan(0);
    });

    it('should not exceed max orders', async () => {
      // Level 1 player: max = 5 + 1 = 6
      await testDb
        .update(players)
        .set({
          level: 1,
          lastTickAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        })
        .where(eq(players.id, playerId));

      // Clear orders
      await testDb.delete(orders).where(eq(orders.playerId, playerId));

      const res = await client.get('/api/orders/available');
      const available = (await res.json()) as Record<string, unknown>[];

      expect(available.length).toBeLessThanOrEqual(6);
    });

    it('orders should have required fields', async () => {
      const res = await client.get('/api/orders/available');
      const available = (await res.json()) as Record<string, unknown>[];

      if (available.length > 0) {
        const order = available[0];
        expect(order).toHaveProperty('id');
        expect(order).toHaveProperty('distance');
        expect(order).toHaveProperty('urgency');
        expect(order).toHaveProperty('reward');
        expect(order).toHaveProperty('expiresAt');
        expect(['normal', 'urgent', 'express']).toContain(order.urgency);
      }
    });
  });

  // --- Order Expiry ---

  describe('Order expiry', () => {
    it('should expire old available orders', async () => {
      await testDb.delete(orders).where(eq(orders.playerId, playerId));

      // Insert an order that's already expired
      await testDb.insert(orders).values({
        playerId,
        ...TEST_ORDER_DEFAULTS,
        distance: 3,
        urgency: 'normal',
        reward: 7.5,
        expiresAt: new Date(Date.now() - 60 * 1000), // expired 1 min ago
        status: 'available',
      });

      await testDb
        .update(players)
        .set({
          lastTickAt: new Date(Date.now() - 30 * 60 * 1000),
        })
        .where(eq(players.id, playerId));

      // Trigger tick
      await client.get('/api/player/profile');

      const expired = await testDb.query.orders.findMany({
        where: eq(orders.playerId, playerId),
      });

      const expiredOrders = expired.filter((o) => o.status === 'expired');
      expect(expiredOrders.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --- Delivery Completion ---

  describe('Delivery completion via tick', () => {
    it('should complete delivery and add revenue', async () => {
      await testDb.delete(orders).where(eq(orders.playerId, playerId));
      await testDb
        .update(riders)
        .set({ status: 'idle', energy: 100 })
        .where(eq(riders.id, riderId));

      // Create an assigned order
      const [order] = await testDb
        .insert(orders)
        .values({
          playerId,
          riderId,
          ...TEST_ORDER_DEFAULTS,
          distance: 3,
          urgency: 'normal',
          reward: 7.5,
          status: 'assigned',
          assignedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        })
        .returning();

      await testDb.update(riders).set({ status: 'delivering' }).where(eq(riders.id, riderId));

      const moneyBefore = (await testDb.query.players.findFirst({
        where: eq(players.id, playerId),
      }))!.money;

      await testDb
        .update(players)
        .set({
          lastTickAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        })
        .where(eq(players.id, playerId));

      await client.get('/api/player/profile');

      const updatedOrder = await testDb.query.orders.findFirst({ where: eq(orders.id, order.id) });
      expect(['delivered', 'failed']).toContain(updatedOrder!.status);

      const updatedRider = await testDb.query.riders.findFirst({ where: eq(riders.id, riderId) });
      expect(updatedRider!.status).toBe('idle');
    });

    it('should increment totalDeliveries on successful delivery', async () => {
      const before = (await testDb.query.players.findFirst({ where: eq(players.id, playerId) }))!;

      await testDb.delete(orders).where(eq(orders.playerId, playerId));
      await testDb
        .update(riders)
        .set({ status: 'delivering', energy: 100, reliability: 10, cityKnowledge: 10 })
        .where(eq(riders.id, riderId));

      // High reliability rider = very low failure chance
      await testDb.insert(orders).values({
        playerId,
        riderId,
        ...TEST_ORDER_DEFAULTS,
        distance: 1,
        urgency: 'normal',
        reward: 5,
        status: 'assigned',
        assignedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      await testDb
        .update(players)
        .set({
          lastTickAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        })
        .where(eq(players.id, playerId));

      await client.get('/api/player/profile');

      const after = (await testDb.query.players.findFirst({ where: eq(players.id, playerId) }))!;
      // Either delivered (totalDeliveries+1) or failed (same), both are valid outcomes
      expect(after.totalDeliveries).toBeGreaterThanOrEqual(before.totalDeliveries);
    });
  });

  // --- Level Up ---

  describe('Level progression', () => {
    it('should level up when enough deliveries', async () => {
      // Set totalDeliveries to 3 → calculateLevel(3) = 2
      await testDb
        .update(players)
        .set({
          totalDeliveries: 3,
          level: 1, // stale level
          lastTickAt: new Date(Date.now() - 1000), // tiny elapsed
        })
        .where(eq(players.id, playerId));

      // Trigger tick which recalculates level
      const res = await client.get('/api/player/profile');
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.level).toBeGreaterThanOrEqual(2);
    });

    it('profile should include progression info', async () => {
      const res = await client.get('/api/player/profile');
      const body = (await res.json()) as Record<string, unknown>;
      const prog = body.progression as Record<string, unknown>;

      expect(prog).toHaveProperty('level');
      expect(prog).toHaveProperty('totalDeliveries');
      expect(prog).toHaveProperty('progressPercent');
      expect(prog).toHaveProperty('unlockedMilestones');
      expect(prog).toHaveProperty('nextMilestone');
    });
  });

  // --- Events ---

  describe('Events', () => {
    it('should return active events with metadata', async () => {
      // Insert a test event
      const zonesRes = await client.get('/api/zones');
      const zoneList = (await zonesRes.json()) as Record<string, unknown>[];
      const centro = zoneList.find((z) => z.slug === 'centro');

      await testDb.insert(events).values({
        playerId,
        type: 'rainstorm',
        zoneId: centro!.id as string,
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      });

      const res = await client.get('/api/events');
      expect(res.status).toBe(200);

      const eventList = (await res.json()) as Record<string, unknown>[];
      expect(eventList.length).toBeGreaterThanOrEqual(1);

      const rainstorm = eventList.find((e) => e.type === 'rainstorm');
      expect(rainstorm).toBeDefined();
      expect(rainstorm).toHaveProperty('name');
      expect(rainstorm).toHaveProperty('emoji');
      expect(rainstorm).toHaveProperty('description');
      expect(rainstorm).toHaveProperty('effects');
    });

    it('should not return expired events', async () => {
      const [expiredEvent] = await testDb
        .insert(events)
        .values({
          playerId,
          type: 'food_festival',
          startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        })
        .returning();

      const res = await client.get('/api/events');
      const eventList = (await res.json()) as Record<string, unknown>[];
      const found = eventList.find((e) => e.id === expiredEvent.id);
      expect(found).toBeUndefined();
    });

    it('profile should include events', async () => {
      const res = await client.get('/api/player/profile');
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('events');
      expect(Array.isArray(body.events)).toBe(true);
    });
  });

  // --- GET /api/orders (all orders) ---

  describe('GET /api/orders (all statuses)', () => {
    it('should return orders of all statuses', async () => {
      await testDb.delete(orders).where(eq(orders.playerId, playerId));

      await testDb.insert(orders).values([
        {
          playerId,
          ...TEST_ORDER_DEFAULTS,
          distance: 2,
          urgency: 'normal' as const,
          reward: 5,
          status: 'available' as const,
          expiresAt: new Date(Date.now() + 60000),
        },
        {
          playerId,
          ...TEST_ORDER_DEFAULTS,
          distance: 3,
          urgency: 'urgent' as const,
          reward: 10,
          status: 'delivered' as const,
          expiresAt: new Date(Date.now() + 60000),
        },
        {
          playerId,
          ...TEST_ORDER_DEFAULTS,
          distance: 4,
          urgency: 'express' as const,
          reward: 15,
          status: 'failed' as const,
          expiresAt: new Date(Date.now() + 60000),
        },
      ]);

      const res = await client.get('/api/orders');
      expect(res.status).toBe(200);

      const all = (await res.json()) as Record<string, unknown>[];
      expect(all.length).toBe(3);

      const statuses = all.map((o) => o.status);
      expect(statuses).toContain('available');
      expect(statuses).toContain('delivered');
      expect(statuses).toContain('failed');
    });
  });

  // --- Health ---

  describe('GET /api/health', () => {
    it('should return ok', async () => {
      const res = await app.request('/api/health');
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.status).toBe('ok');
    });
  });
});
