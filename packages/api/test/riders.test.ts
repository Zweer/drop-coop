import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockDb, createTestToken, mockInsertReturning, mockUpdateWhere } from './helpers.ts';

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
  return app.request(path, { headers: { Authorization: authHeader } });
}

function post(path: string, body: unknown) {
  return app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader },
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
  it('should return 3 riders', async () => {
    const res = await get('/api/riders/pool');

    expect(res.status).toBe(200);
    const pool = await res.json();
    expect(pool).toHaveLength(3);
    expect(pool[0]).toHaveProperty('name');
    expect(pool[0]).toHaveProperty('speed');
    expect(pool[0]).toHaveProperty('hireCost');
  });
});

describe('POST /api/riders/hire', () => {
  const hireBody = { name: 'Marco', speed: 5, reliability: 5, cityKnowledge: 5, stamina: 5 };

  it('should hire a rider', async () => {
    mockDb.query.players.findFirst.mockResolvedValueOnce({ id: PLAYER_ID, money: 500 });
    mockDb.update.mockReturnValueOnce(mockUpdateWhere());
    mockDb.insert.mockReturnValueOnce(
      mockInsertReturning([{ id: 'r1', ...hireBody, playerId: PLAYER_ID }]),
    );

    const res = await post('/api/riders/hire', hireBody);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('Marco');
  });

  it('should reject if not enough money', async () => {
    mockDb.query.players.findFirst.mockResolvedValueOnce({ id: PLAYER_ID, money: 1 });

    const res = await post('/api/riders/hire', hireBody);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/money/i);
  });

  it('should reject invalid stats', async () => {
    const res = await post('/api/riders/hire', { name: 'Marco', speed: 99 });
    expect(res.status).toBe(400);
  });
});
