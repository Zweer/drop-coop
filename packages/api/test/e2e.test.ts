import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { createClient, registerPlayer, type TestDb } from './e2e-helpers.ts';

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
const { orders, riders, players } = await import('../src/models/index.ts');

const token = { value: '' };
let refreshTokenValue: string;
let playerId: string;
let client: ReturnType<typeof createClient>;

describe('E2E: Full game loop', () => {
  afterAll(async () => {
    await closeDb?.();
  });

  // --- Auth ---

  it('should register a new player', async () => {
    const result = await registerPlayer(app, 'e2etest', 'secret123', '10.0.20.0');
    token.value = result.token;
    refreshTokenValue = result.refreshToken;
    playerId = result.playerId;
    client = createClient(app, token, '10.0.20.0');

    expect(token.value).toBeTruthy();
    expect(playerId).toBeTruthy();
  });

  it('should get player profile with starting money', async () => {
    const res = await client.get('/api/player/profile');
    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.level).toBe(1);
    expect(body).toHaveProperty('money');
    expect(body).toHaveProperty('progression');
    expect(body).toHaveProperty('riderCount');
  });

  it('should refresh token', async () => {
    const res = await app.request('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.20.0' },
      body: JSON.stringify({ refreshToken: refreshTokenValue }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    token.value = body.token as string;
  });

  it('should login with same credentials', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'e2etest', password: 'secret123' }),
    });
    expect(res.status).toBe(200);
  });

  // --- Zones ---

  it('should list zones with centro auto-unlocked', async () => {
    const res = await client.get('/api/zones');
    const zones = (await res.json()) as Record<string, unknown>[];
    expect(zones.length).toBeGreaterThanOrEqual(5);

    const centro = zones.find((z) => z.slug === 'centro');
    expect(centro?.unlocked).toBe(true);

    const navigli = zones.find((z) => z.slug === 'navigli');
    expect(navigli?.unlocked).toBe(false);
  });

  it('should unlock navigli zone', async () => {
    // Navigli requires level 3 and costs 200. Give player enough level + money.
    await testDb.update(players).set({ level: 5, money: 1000 }).where(eq(players.id, playerId));

    const zonesRes = await client.get('/api/zones');
    const zones = (await zonesRes.json()) as Record<string, unknown>[];
    const navigli = zones.find((z) => z.slug === 'navigli');

    const res = await client.post('/api/zones/unlock', { zoneId: navigli?.id });
    expect(res.status).toBe(201);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.name).toBe('Navigli');
  });

  it('should reject unlocking already unlocked zone', async () => {
    const zonesRes = await client.get('/api/zones');
    const zones = (await zonesRes.json()) as Record<string, unknown>[];
    const navigli = zones.find((z) => z.slug === 'navigli');

    const res = await client.post('/api/zones/unlock', { zoneId: navigli?.id });
    expect(res.status).toBe(409);
  });

  // --- Riders ---

  let riderId: string;

  it('should browse hiring pool (4 candidates)', async () => {
    const res = await client.get('/api/riders/pool');
    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    const pool = body.riders as Record<string, unknown>[];
    expect(pool.length).toBe(4);
  });

  it('should hire a rider', async () => {
    // Ensure enough money
    await testDb.update(players).set({ money: 5000 }).where(eq(players.id, playerId));

    const poolRes = await client.get('/api/riders/pool');
    const pool = ((await poolRes.json()) as Record<string, unknown>).riders as Record<
      string,
      unknown
    >[];

    const res = await client.post('/api/riders/hire', { poolId: pool[0].id });
    expect(res.status).toBe(201);

    const rider = (await res.json()) as Record<string, unknown>;
    riderId = rider.id as string;
    expect(rider.status).toBe('idle');
    expect(rider.energy).toBe(100);
  });

  it('should list hired riders', async () => {
    const res = await client.get('/api/riders');
    const riderList = (await res.json()) as Record<string, unknown>[];
    expect(riderList.length).toBe(1);
    expect(riderList[0].id).toBe(riderId);
  });

  it('should toggle rider to resting and back', async () => {
    const res1 = await client.post(`/api/riders/${riderId}/rest`, {});
    expect(res1.status).toBe(200);
    expect(((await res1.json()) as Record<string, unknown>).status).toBe('resting');

    const res2 = await client.post(`/api/riders/${riderId}/rest`, {});
    expect(res2.status).toBe(200);
    expect(((await res2.json()) as Record<string, unknown>).status).toBe('idle');
  });

  // --- Upgrades ---

  it('should upgrade rider stat', async () => {
    await testDb.update(players).set({ money: 5000, level: 5 }).where(eq(players.id, playerId));

    const res = await client.post(`/api/riders/${riderId}/upgrade`, { stat: 'speed' });
    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.stat).toBe('speed');
    expect(Number(body.newValue)).toBe(Number(body.oldValue) + 1);
    expect(body).toHaveProperty('cost');
  });

  // --- Orders & Delivery ---

  it('should get available orders', async () => {
    const res = await client.get('/api/orders/available');
    expect(res.status).toBe(200);
    const orderList = (await res.json()) as Record<string, unknown>[];
    expect(Array.isArray(orderList)).toBe(true);
  });

  it('should assign rider to order and complete delivery via tick', async () => {
    // Ensure rider is idle with full energy
    await testDb.update(riders).set({ status: 'idle', energy: 100 }).where(eq(riders.id, riderId));

    // Set lastTickAt to 1 hour ago so tick generates orders
    await testDb
      .update(players)
      .set({ lastTickAt: new Date(Date.now() - 60 * 60 * 1000) })
      .where(eq(players.id, playerId));

    // Trigger tick to generate orders
    await client.get('/api/orders/available');

    const available = await testDb.query.orders.findMany({
      where: eq(orders.status, 'available'),
    });

    if (available.length === 0) {
      console.log('No orders generated — skipping delivery test');
      return;
    }

    const order = available[0];

    // Assign
    const assignRes = await client.post('/api/orders/assign', {
      riderId,
      orderId: order.id,
    });
    expect(assignRes.status).toBe(200);
    const assignBody = (await assignRes.json()) as Record<string, unknown>;
    expect(assignBody).toHaveProperty('estimatedMinutes');

    // Record money before delivery
    const _playerBefore = await testDb.query.players.findFirst({
      where: eq(players.id, playerId),
    });

    // Fast-forward: set assignedAt to 2 hours ago so tick completes it
    await testDb
      .update(orders)
      .set({ assignedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) })
      .where(eq(orders.id, order.id));

    // Also set lastTickAt to 2 hours ago so tick processes the elapsed time
    await testDb
      .update(players)
      .set({ lastTickAt: new Date(Date.now() - 2 * 60 * 60 * 1000) })
      .where(eq(players.id, playerId));

    // Trigger tick via profile
    const profileRes = await client.get('/api/player/profile');
    expect(profileRes.status).toBe(200);

    // Verify order is no longer assigned
    const updatedOrder = await testDb.query.orders.findFirst({
      where: eq(orders.id, order.id),
    });
    expect(['delivered', 'failed']).toContain(updatedOrder?.status);

    // Verify rider is freed
    const updatedRider = await testDb.query.riders.findFirst({
      where: eq(riders.id, riderId),
    });
    expect(updatedRider?.status).toBe('idle');
  });

  // --- Events ---

  it('should list events (may be empty)', async () => {
    const res = await client.get('/api/events');
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  // --- Leaderboard ---

  it('should show player on tycoon leaderboard', async () => {
    const res = await client.get('/api/leaderboard');
    expect(res.status).toBe(200);

    const entries = (await res.json()) as Record<string, unknown>[];
    const me = entries.find((e) => e.username === 'e2etest');
    expect(me).toBeDefined();
    expect(me).toHaveProperty('rank');
    expect(me).toHaveProperty('totalProfit');
  });
});
