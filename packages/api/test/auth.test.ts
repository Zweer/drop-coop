import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockDb, mockInsertReturning } from './helpers.ts';

const mockDb = createMockDb();
vi.mock('../src/db/index.ts', () => ({ db: mockDb }));

const { default: app } = await import('../src/app.ts');

function post(path: string, body: unknown) {
  return app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/register', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should register a new player', async () => {
    mockDb.query.players.findFirst.mockResolvedValueOnce(undefined);
    mockDb.insert.mockReturnValueOnce(mockInsertReturning([{ id: 'p1', username: 'testuser' }]));

    const res = await post('/api/auth/register', { username: 'testuser', password: 'secret123' });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.token).toBeDefined();
    expect(body.player.username).toBe('testuser');
  });

  it('should reject duplicate username', async () => {
    mockDb.query.players.findFirst.mockResolvedValueOnce({ id: 'p1', username: 'taken' });

    const res = await post('/api/auth/register', { username: 'taken', password: 'secret123' });

    expect(res.status).toBe(409);
  });

  it('should reject short username', async () => {
    const res = await post('/api/auth/register', { username: 'ab', password: 'secret123' });
    expect(res.status).toBe(400);
  });

  it('should reject short password', async () => {
    const res = await post('/api/auth/register', { username: 'testuser', password: '123' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should login with correct credentials', async () => {
    const hash = Buffer.from(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode('secret123')),
    ).toString('hex');

    mockDb.query.players.findFirst.mockResolvedValueOnce({
      id: 'p1',
      username: 'testuser',
      passwordHash: hash,
    });

    const res = await post('/api/auth/login', { username: 'testuser', password: 'secret123' });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeDefined();
    expect(body.player.id).toBe('p1');
  });

  it('should reject wrong password', async () => {
    mockDb.query.players.findFirst.mockResolvedValueOnce({
      id: 'p1',
      username: 'testuser',
      passwordHash: 'wronghash',
    });

    const res = await post('/api/auth/login', { username: 'testuser', password: 'secret123' });

    expect(res.status).toBe(401);
  });

  it('should reject non-existent user', async () => {
    mockDb.query.players.findFirst.mockResolvedValueOnce(undefined);

    const res = await post('/api/auth/login', { username: 'ghost', password: 'secret123' });

    expect(res.status).toBe(401);
  });

  it('should reject missing fields', async () => {
    const res = await post('/api/auth/login', {});
    expect(res.status).toBe(400);
  });
});
