import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockDb, createTestToken, mockUpdateWhere } from './helpers.ts';

const mockDb = createMockDb();
vi.mock('../src/db/index.ts', () => ({ db: mockDb }));
vi.mock('../src/services/tick.ts', () => ({
  runTick: vi.fn().mockResolvedValue({
    player: { id: 'p1', money: 500 },
    riders: [],
    orders: [],
    revenue: 0,
    costs: 0,
  }),
}));

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

describe('GET /api/orders', () => {
  it('should return order list', async () => {
    const orders = [{ id: 'o1', status: 'available', reward: 10 }];
    mockDb.query.orders.findMany.mockResolvedValueOnce(orders);

    const res = await get('/api/orders');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(orders);
  });
});

describe('POST /api/orders/assign', () => {
  const riderId = '00000000-0000-0000-0000-000000000001';
  const orderId = '00000000-0000-0000-0000-000000000002';

  it('should assign a rider to an order', async () => {
    mockDb.query.riders.findFirst.mockResolvedValueOnce({
      id: riderId,
      playerId: PLAYER_ID,
      status: 'idle',
      speed: 5,
      cityKnowledge: 5,
      stamina: 5,
      energy: 80,
    });
    mockDb.query.orders.findFirst.mockResolvedValueOnce({
      id: orderId,
      playerId: PLAYER_ID,
      status: 'available',
      distance: 5,
    });
    mockDb.update.mockReturnValueOnce(mockUpdateWhere()); // update order
    mockDb.update.mockReturnValueOnce(mockUpdateWhere()); // update rider

    const res = await post('/api/orders/assign', { riderId, orderId });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.orderId).toBe(orderId);
    expect(body.riderId).toBe(riderId);
    expect(body.estimatedMinutes).toBeGreaterThan(0);
  });

  it('should reject if rider is busy', async () => {
    mockDb.query.riders.findFirst.mockResolvedValueOnce({
      id: riderId,
      playerId: PLAYER_ID,
      status: 'delivering',
    });

    const res = await post('/api/orders/assign', { riderId, orderId });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/busy/i);
  });

  it('should reject if rider not found', async () => {
    mockDb.query.riders.findFirst.mockResolvedValueOnce(undefined);

    const res = await post('/api/orders/assign', { riderId, orderId });

    expect(res.status).toBe(404);
  });

  it('should reject if order not available', async () => {
    mockDb.query.riders.findFirst.mockResolvedValueOnce({
      id: riderId,
      playerId: PLAYER_ID,
      status: 'idle',
      energy: 80,
    });
    mockDb.query.orders.findFirst.mockResolvedValueOnce(undefined);

    const res = await post('/api/orders/assign', { riderId, orderId });

    expect(res.status).toBe(404);
  });

  it('should reject if rider too tired', async () => {
    mockDb.query.riders.findFirst.mockResolvedValueOnce({
      id: riderId,
      playerId: PLAYER_ID,
      status: 'idle',
      speed: 5,
      cityKnowledge: 5,
      stamina: 5,
      energy: 1,
    });
    mockDb.query.orders.findFirst.mockResolvedValueOnce({
      id: orderId,
      playerId: PLAYER_ID,
      status: 'available',
      distance: 10,
    });

    const res = await post('/api/orders/assign', { riderId, orderId });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/tired/i);
  });

  it('should reject invalid UUIDs', async () => {
    const res = await post('/api/orders/assign', { riderId: 'bad', orderId: 'bad' });
    expect(res.status).toBe(400);
  });
});
