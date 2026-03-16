import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createMockDb,
  createTestToken,
  mockInsertReturning,
  mockUpdateWhere,
  trackerInsertNoop,
} from './helpers.ts';

const mockDb = createMockDb();
vi.mock('../src/db/index.ts', () => ({ db: mockDb }));

const { default: app } = await import('../src/app.ts');

const PLAYER_ID = 'p1';
let authHeader: string;

beforeEach(async () => {
  vi.clearAllMocks();
  authHeader = `Bearer ${await createTestToken(PLAYER_ID)}`;
});

function get(path: string) {
  return app.request(path, {
    headers: { Authorization: authHeader, 'X-Forwarded-For': 'test-riders' },
  });
}

function post(path: string, body: unknown) {
  return app.request(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
      'X-Forwarded-For': 'test-riders',
    },
    body: JSON.stringify(body),
  });
}

describe('auth middleware', () => {
  it('should reject requests without token', async () => {
    const res = await app.request('/api/riders');
    expect(res.status).toBe(401);
  });

  it('should reject invalid token', async () => {
    const res = await app.request('/api/riders', {
      headers: { Authorization: 'Bearer invalid' },
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/riders', () => {
  it('should return rider list', async () => {
    const riders = [{ id: 'r1', name: 'Marco', speed: 5 }];
    mockDb.query.riders.findMany.mockResolvedValueOnce(riders);

    const res = await get('/api/riders');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(riders);
  });
});

describe('GET /api/riders/pool', () => {
  it('should return pool with riders and refresh timer', async () => {
    const poolEntries = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        playerId: PLAYER_ID,
        name: 'Marco',
        speed: 5,
        reliability: 5,
        cityKnowledge: 5,
        stamina: 5,
        hireCost: 50,
        salary: 10,
        expiresAt: new Date(Date.now() + 3600000),
      },
    ];
    mockDb.query.riderPool.findMany.mockResolvedValueOnce(poolEntries);

    const res = await get('/api/riders/pool');

    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.riders).toHaveLength(1);
    expect(body.riders[0]).toHaveProperty('name');
    expect(body).toHaveProperty('refreshesIn');
  });

  it('should generate pool if empty', async () => {
    mockDb.query.riderPool.findMany.mockResolvedValueOnce([]);
    const generated = [
      {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Sara',
        speed: 4,
        reliability: 6,
        cityKnowledge: 3,
        stamina: 5,
        hireCost: 45,
        salary: 9,
        expiresAt: new Date(Date.now() + 3600000),
      },
    ];
    mockDb.insert.mockReturnValueOnce(trackerInsertNoop); // endpoint tracker
    mockDb.insert.mockReturnValueOnce(mockInsertReturning(generated));

    const res = await get('/api/riders/pool');

    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.riders).toHaveLength(1);
  });
});

describe('POST /api/riders/hire', () => {
  const POOL_ID = '00000000-0000-0000-0000-000000000001';

  it('should hire a rider from pool', async () => {
    const poolEntry = {
      id: POOL_ID,
      playerId: PLAYER_ID,
      name: 'Marco',
      speed: 5,
      reliability: 5,
      cityKnowledge: 5,
      stamina: 5,
      hireCost: 50,
      salary: 10,
    };
    mockDb.query.riderPool.findFirst.mockResolvedValueOnce(poolEntry);
    mockDb.query.players.findFirst.mockResolvedValueOnce({ id: PLAYER_ID, money: 500 });
    mockDb.update.mockReturnValueOnce(mockUpdateWhere()); // player money
    mockDb.insert.mockReturnValueOnce(trackerInsertNoop); // endpoint tracker
    mockDb.insert.mockReturnValueOnce(
      mockInsertReturning([{ id: 'r1', ...poolEntry, playerId: PLAYER_ID }]),
    );
    mockDb.delete.mockReturnValueOnce({ where: vi.fn().mockResolvedValue(undefined) });

    const res = await post('/api/riders/hire', { poolId: POOL_ID });

    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.name).toBe('Marco');
  });

  it('should reject if not enough money', async () => {
    const poolEntry = {
      id: POOL_ID,
      playerId: PLAYER_ID,
      name: 'Marco',
      speed: 5,
      reliability: 5,
      cityKnowledge: 5,
      stamina: 5,
      hireCost: 50,
      salary: 10,
    };
    mockDb.query.riderPool.findFirst.mockResolvedValueOnce(poolEntry);
    mockDb.query.players.findFirst.mockResolvedValueOnce({ id: PLAYER_ID, money: 1 });

    const res = await post('/api/riders/hire', { poolId: POOL_ID });

    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error).toMatch(/money/i);
  });

  it('should reject if pool entry not found', async () => {
    mockDb.query.riderPool.findFirst.mockResolvedValueOnce(undefined);

    const res = await post('/api/riders/hire', { poolId: '00000000-0000-0000-0000-000000000099' });

    expect(res.status).toBe(404);
  });
});

describe('POST /api/riders/:id/upgrade', () => {
  const RIDER_ID = 'r1';

  function postUpgrade(riderId: string, body: unknown) {
    return app.request(`/api/riders/${riderId}/upgrade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
        'X-Forwarded-For': 'test-riders',
      },
      body: JSON.stringify(body),
    });
  }

  it('should upgrade a rider stat', async () => {
    mockDb.query.players.findFirst.mockResolvedValueOnce({ id: PLAYER_ID, money: 500, level: 5 });
    mockDb.query.riders.findFirst.mockResolvedValueOnce({
      id: RIDER_ID,
      playerId: PLAYER_ID,
      speed: 5,
    });
    mockDb.query.events.findMany.mockResolvedValueOnce([]); // no active events
    mockDb.update.mockReturnValueOnce(mockUpdateWhere()); // player money
    mockDb.update.mockReturnValueOnce(mockUpdateWhere()); // rider stat

    const res = await postUpgrade(RIDER_ID, { stat: 'speed' });

    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.oldValue).toBe(5);
    expect(body.newValue).toBe(6);
    expect(body.cost).toBe(150);
  });

  it('should reject if player level too low', async () => {
    mockDb.query.players.findFirst.mockResolvedValueOnce({ id: PLAYER_ID, money: 500, level: 3 });

    const res = await postUpgrade(RIDER_ID, { stat: 'speed' });

    expect(res.status).toBe(403);
  });

  it('should reject if stat already at max', async () => {
    mockDb.query.players.findFirst.mockResolvedValueOnce({ id: PLAYER_ID, money: 500, level: 5 });
    mockDb.query.riders.findFirst.mockResolvedValueOnce({
      id: RIDER_ID,
      playerId: PLAYER_ID,
      speed: 10,
    });

    const res = await postUpgrade(RIDER_ID, { stat: 'speed' });

    expect(res.status).toBe(400);
    expect(((await res.json()) as any).error).toMatch(/max/i);
  });

  it('should reject invalid stat name', async () => {
    const res = await postUpgrade(RIDER_ID, { stat: 'morale' });

    expect(res.status).toBe(400);
  });

  it('should reject if not enough money', async () => {
    mockDb.query.players.findFirst.mockResolvedValueOnce({ id: PLAYER_ID, money: 10, level: 5 });
    mockDb.query.riders.findFirst.mockResolvedValueOnce({
      id: RIDER_ID,
      playerId: PLAYER_ID,
      speed: 5,
    });
    mockDb.query.events.findMany.mockResolvedValueOnce([]); // no active events

    const res = await postUpgrade(RIDER_ID, { stat: 'speed' });

    expect(res.status).toBe(400);
    expect(((await res.json()) as any).error).toMatch(/money/i);
  });
});
