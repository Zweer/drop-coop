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
const { orders, players, riders } = await import('../src/models/index.ts');

afterAll(async () => {
  await closeDb?.();
});

function rawPost(path: string, body: unknown, ip = '10.0.0.1') {
  return app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
    body: JSON.stringify(body),
  });
}

describe('Auth edge cases', () => {
  const IP = '10.0.1.0';

  it('should reject register with short username', async () => {
    const res = await rawPost('/api/auth/register', { username: 'ab', password: 'secret123' }, IP);
    expect(res.status).toBe(400);
  });

  it('should reject register with short password', async () => {
    const res = await rawPost(
      '/api/auth/register',
      { username: 'testuser', password: '12345' },
      IP,
    );
    expect(res.status).toBe(400);
  });

  it('should reject register with missing fields', async () => {
    const res = await rawPost('/api/auth/register', { username: 'testuser' }, IP);
    expect(res.status).toBe(400);
  });

  it('should reject login with wrong username', async () => {
    const res = await rawPost(
      '/api/auth/login',
      { username: 'noexist', password: 'secret123' },
      '10.0.1.1',
    );
    expect(res.status).toBe(401);
  });

  it('should reject login with wrong password', async () => {
    await registerPlayer(app, 'authtest', 'correct1', '10.0.1.2');
    const res = await rawPost(
      '/api/auth/login',
      { username: 'authtest', password: 'wrong123' },
      '10.0.1.3',
    );
    expect(res.status).toBe(401);
  });

  it('should reject duplicate username', async () => {
    const res = await rawPost(
      '/api/auth/register',
      { username: 'authtest', password: 'other123' },
      '10.0.1.4',
    );
    expect(res.status).toBe(409);
  });

  it('should reject request without token', async () => {
    const res = await app.request('/api/player/profile');
    expect(res.status).toBe(401);
  });

  it('should reject request with invalid token', async () => {
    const res = await app.request('/api/player/profile', {
      headers: { Authorization: 'Bearer invalid.token.here' },
    });
    expect(res.status).toBe(401);
  });

  it('should reject refresh with invalid token', async () => {
    const res = await rawPost('/api/auth/refresh', { refreshToken: 'bad' }, '10.0.1.5');
    expect(res.status).toBe(401);
  });
});

describe('Order edge cases', () => {
  let client: ReturnType<typeof createClient>;
  let playerId: string;
  const token = { value: '' };
  const IP = '10.0.2.0';

  it('setup: register player and hire rider', async () => {
    const result = await registerPlayer(app, 'ordertest', 'secret123', IP);
    token.value = result.token;
    playerId = result.playerId;
    client = createClient(app, token, IP);

    await testDb.update(players).set({ money: 5000, level: 5 }).where(eq(players.id, playerId));

    // Hire a rider
    const poolRes = await client.get('/api/riders/pool');
    const pool = ((await poolRes.json()) as Record<string, unknown>).riders as Record<
      string,
      unknown
    >[];
    await client.post('/api/riders/hire', { poolId: pool[0].id });
  });

  it('should reject assign with invalid rider ID', async () => {
    const res = await client.post('/api/orders/assign', {
      riderId: '00000000-0000-0000-0000-000000000099',
      orderId: '00000000-0000-0000-0000-000000000099',
    });
    expect(res.status).toBe(404);
  });

  it('should reject assign with invalid order ID', async () => {
    const riderList = (await (await client.get('/api/riders')).json()) as Record<string, unknown>[];
    const res = await client.post('/api/orders/assign', {
      riderId: riderList[0].id,
      orderId: '00000000-0000-0000-0000-000000000099',
    });
    expect(res.status).toBe(404);
  });

  it('should reject assign when rider is busy', async () => {
    const riderList = (await (await client.get('/api/riders')).json()) as Record<string, unknown>[];
    const riderId = riderList[0].id as string;

    // Set rider to delivering
    await testDb.update(riders).set({ status: 'delivering' }).where(eq(riders.id, riderId));

    const res = await client.post('/api/orders/assign', {
      riderId,
      orderId: '00000000-0000-0000-0000-000000000099',
    });
    expect(res.status).toBe(400);

    // Reset
    await testDb.update(riders).set({ status: 'idle' }).where(eq(riders.id, riderId));
  });

  it('should reject assign when rider has no energy', async () => {
    const riderList = (await (await client.get('/api/riders')).json()) as Record<string, unknown>[];
    const riderId = riderList[0].id as string;

    // Drain energy
    await testDb.update(riders).set({ energy: 0 }).where(eq(riders.id, riderId));

    // Generate an order
    await client.get('/api/orders/available');
    const available = await testDb.query.orders.findMany({
      where: eq(orders.status, 'available'),
    });

    if (available.length > 0) {
      const res = await client.post('/api/orders/assign', {
        riderId,
        orderId: available[0].id,
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.error).toMatch(/tired/i);
    }

    // Reset
    await testDb.update(riders).set({ energy: 100 }).where(eq(riders.id, riderId));
  });
});

describe('Zone edge cases', () => {
  let client: ReturnType<typeof createClient>;
  let playerId: string;
  const token = { value: '' };
  const IP = '10.0.3.0';

  it('setup: register player', async () => {
    const result = await registerPlayer(app, 'zonetest', 'secret123', IP);
    token.value = result.token;
    playerId = result.playerId;
    client = createClient(app, token, IP);
  });

  it('should reject unlock with level too low', async () => {
    await testDb.update(players).set({ level: 1, money: 9999 }).where(eq(players.id, playerId));

    const zonesRes = await client.get('/api/zones');
    const cities = (await zonesRes.json()) as { zones: Record<string, unknown>[] }[];
    const zones = flattenZones(cities);
    const navigli = zones.find((z) => z.slug === 'navigli');

    const res = await client.post('/api/zones/unlock', { zoneId: navigli?.id });
    expect(res.status).toBe(403);
  });

  it('should reject unlock with not enough money', async () => {
    await testDb.update(players).set({ level: 10, money: 1 }).where(eq(players.id, playerId));

    const zonesRes = await client.get('/api/zones');
    const cities = (await zonesRes.json()) as { zones: Record<string, unknown>[] }[];
    const zones = flattenZones(cities);
    const navigli = zones.find((z) => z.slug === 'navigli');

    const res = await client.post('/api/zones/unlock', { zoneId: navigli?.id });
    expect(res.status).toBe(400);
  });

  it('should reject unlock of nonexistent zone', async () => {
    const res = await client.post('/api/zones/unlock', {
      zoneId: '00000000-0000-0000-0000-000000000099',
    });
    expect(res.status).toBe(404);
  });
});

describe('Upgrade edge cases', () => {
  let client: ReturnType<typeof createClient>;
  let playerId: string;
  let riderId: string;
  const token = { value: '' };
  const IP = '10.0.4.0';

  it('setup: register, hire rider', async () => {
    const result = await registerPlayer(app, 'upgradetest', 'secret123', IP);
    token.value = result.token;
    playerId = result.playerId;
    client = createClient(app, token, IP);

    await testDb.update(players).set({ money: 5000, level: 5 }).where(eq(players.id, playerId));

    const poolRes = await client.get('/api/riders/pool');
    const pool = ((await poolRes.json()) as Record<string, unknown>).riders as Record<
      string,
      unknown
    >[];
    const hireRes = await client.post('/api/riders/hire', { poolId: pool[0].id });
    riderId = ((await hireRes.json()) as Record<string, unknown>).id as string;
  });

  it('should reject upgrade when level too low', async () => {
    await testDb.update(players).set({ level: 1 }).where(eq(players.id, playerId));

    const res = await client.post(`/api/riders/${riderId}/upgrade`, { stat: 'speed' });
    expect(res.status).toBe(403);

    await testDb.update(players).set({ level: 5 }).where(eq(players.id, playerId));
  });

  it('should reject upgrade with not enough money', async () => {
    await testDb.update(players).set({ money: 0 }).where(eq(players.id, playerId));

    const res = await client.post(`/api/riders/${riderId}/upgrade`, { stat: 'speed' });
    expect(res.status).toBe(400);

    await testDb.update(players).set({ money: 5000 }).where(eq(players.id, playerId));
  });

  it('should reject upgrade of invalid stat', async () => {
    const res = await client.post(`/api/riders/${riderId}/upgrade`, { stat: 'charisma' });
    expect(res.status).toBe(400);
  });

  it('should reject upgrade when stat is maxed', async () => {
    await testDb.update(riders).set({ speed: 10 }).where(eq(riders.id, riderId));

    const res = await client.post(`/api/riders/${riderId}/upgrade`, { stat: 'speed' });
    expect(res.status).toBe(400);
  });

  it('should reject upgrade of nonexistent rider', async () => {
    const res = await client.post('/api/riders/00000000-0000-0000-0000-000000000099/upgrade', {
      stat: 'speed',
    });
    expect(res.status).toBe(404);
  });
});

describe('Hire edge cases', () => {
  let client: ReturnType<typeof createClient>;
  let playerId: string;
  const token = { value: '' };
  const IP = '10.0.5.0';

  it('setup: register player', async () => {
    const result = await registerPlayer(app, 'hiretest', 'secret123', IP);
    token.value = result.token;
    playerId = result.playerId;
    client = createClient(app, token, IP);
  });

  it('should reject hire with not enough money', async () => {
    await testDb.update(players).set({ money: 0 }).where(eq(players.id, playerId));

    const poolRes = await client.get('/api/riders/pool');
    const pool = ((await poolRes.json()) as Record<string, unknown>).riders as Record<
      string,
      unknown
    >[];

    const res = await client.post('/api/riders/hire', { poolId: pool[0].id });
    expect(res.status).toBe(400);
  });

  it('should reject hire with invalid pool ID', async () => {
    const res = await client.post('/api/riders/hire', {
      poolId: '00000000-0000-0000-0000-000000000099',
    });
    expect(res.status).toBe(404);
  });

  it('should reject rest on delivering rider', async () => {
    await testDb.update(players).set({ money: 5000 }).where(eq(players.id, playerId));

    const poolRes = await client.get('/api/riders/pool');
    const pool = ((await poolRes.json()) as Record<string, unknown>).riders as Record<
      string,
      unknown
    >[];
    const hireRes = await client.post('/api/riders/hire', { poolId: pool[0].id });
    const riderId = ((await hireRes.json()) as Record<string, unknown>).id as string;

    await testDb.update(riders).set({ status: 'delivering' }).where(eq(riders.id, riderId));

    const res = await client.post(`/api/riders/${riderId}/rest`, {});
    expect(res.status).toBe(400);
  });
});
