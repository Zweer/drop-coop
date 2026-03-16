import { SignJWT } from 'jose';
import { vi } from 'vitest';

const JWT_SECRET = new TextEncoder().encode('dev-secret');

export async function createTestToken(playerId: string): Promise<string> {
  return new SignJWT({ sub: playerId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export function mockInsertReturning(result: unknown[]) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
    }),
  };
}

export function mockUpdateWhere() {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  };
}

export const trackerInsertNoop = {
  values: vi.fn().mockReturnValue({
    returning: vi.fn().mockResolvedValue([]),
    onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
  }),
};

export function createMockDb() {
  return {
    query: {
      players: { findFirst: vi.fn(), findMany: vi.fn() },
      riders: { findFirst: vi.fn(), findMany: vi.fn() },
      orders: { findFirst: vi.fn(), findMany: vi.fn() },
      events: { findFirst: vi.fn(), findMany: vi.fn() },
      authAccounts: { findFirst: vi.fn(), findMany: vi.fn() },
      playerZones: { findFirst: vi.fn(), findMany: vi.fn() },
      riderPool: { findFirst: vi.fn(), findMany: vi.fn() },
      zones: { findFirst: vi.fn(), findMany: vi.fn() },
      discoveredEndpoints: { findFirst: vi.fn(), findMany: vi.fn() },
    },
    insert: vi.fn().mockReturnValue(trackerInsertNoop),
    update: vi.fn(),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  };
}
