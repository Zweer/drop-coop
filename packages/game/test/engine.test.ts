import { describe, expect, it } from 'vitest';

import { processTick } from '../src/engine.js';
import type { Order, Player, Rider } from '../src/types.js';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    money: 500,
    reputation: 50,
    level: 1,
    totalDeliveries: 0,
    totalProfit: 0,
    lastTickAt: new Date('2026-01-01T12:00:00Z'),
    ...overrides,
  };
}

function makeRider(overrides: Partial<Rider> = {}): Rider {
  return {
    id: 'r1',
    playerId: 'p1',
    name: 'Test Rider',
    speed: 5,
    reliability: 5,
    cityKnowledge: 5,
    stamina: 5,
    energy: 80,
    morale: 75,
    status: 'idle',
    salary: 10,
    ...overrides,
  };
}

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    playerId: 'p1',
    riderId: null,
    distance: 5,
    urgency: 'normal',
    status: 'available',
    reward: 10.5,
    expiresAt: new Date('2026-01-01T13:00:00Z'),
    assignedAt: null,
    deliveredAt: null,
    ...overrides,
  };
}

describe('processTick', () => {
  it('should return unchanged state if no time elapsed', () => {
    const player = makePlayer();
    const now = player.lastTickAt;
    const result = processTick(player, [], [], now);

    expect(result.revenue).toBe(0);
    expect(result.costs).toBe(0);
    expect(result.player.money).toBe(500);
  });

  it('should deduct salary costs over time', () => {
    const player = makePlayer();
    const riders = [makeRider({ salary: 10 })];
    const now = new Date('2026-01-01T13:00:00Z'); // 1 hour later

    const result = processTick(player, riders, [], now);

    expect(result.costs).toBe(10);
    expect(result.player.money).toBe(490);
  });

  it('should regenerate rider energy over time', () => {
    const player = makePlayer();
    const riders = [makeRider({ energy: 50 })];
    const now = new Date('2026-01-01T14:00:00Z'); // 2 hours later

    const result = processTick(player, riders, [], now);

    expect(result.riders[0].energy).toBe(70); // 50 + 10/hr * 2hr
  });

  it('should cap energy at 100', () => {
    const player = makePlayer();
    const riders = [makeRider({ energy: 95 })];
    const now = new Date('2026-01-01T14:00:00Z');

    const result = processTick(player, riders, [], now);

    expect(result.riders[0].energy).toBe(100);
  });

  it('should regenerate energy 2x faster for resting riders', () => {
    const player = makePlayer();
    const riders = [makeRider({ energy: 50, status: 'resting' })];
    const now = new Date('2026-01-01T13:00:00Z'); // 1 hour

    const result = processTick(player, riders, [], now);

    expect(result.riders[0].energy).toBe(70); // 50 + 20/hr * 1hr
  });

  it('should complete a delivery when enough time has passed', () => {
    const player = makePlayer();
    const rider = makeRider({ id: 'r1', status: 'delivering' });
    const order = makeOrder({
      status: 'assigned',
      riderId: 'r1',
      assignedAt: new Date('2026-01-01T12:00:00Z'),
    });
    const now = new Date('2026-01-01T13:00:00Z'); // 1 hour later, plenty of time

    const result = processTick(player, [rider], [order], now);

    expect(result.orders[0].status).toBe('delivered');
    expect(result.orders[0].deliveredAt).toBeTruthy();
    expect(result.revenue).toBeGreaterThan(0);
    expect(result.player.totalDeliveries).toBe(1);
  });

  it('should set rider back to idle after delivery completes', () => {
    const player = makePlayer();
    const rider = makeRider({ id: 'r1', status: 'delivering' });
    const order = makeOrder({
      status: 'assigned',
      riderId: 'r1',
      assignedAt: new Date('2026-01-01T12:00:00Z'),
    });
    const now = new Date('2026-01-01T13:00:00Z');

    const result = processTick(player, [rider], [order], now);

    expect(result.riders[0].status).toBe('idle');
  });

  it('should not complete a delivery if not enough time passed', () => {
    const player = makePlayer();
    const rider = makeRider({ id: 'r1', speed: 1, status: 'delivering' }); // very slow
    const order = makeOrder({
      status: 'assigned',
      riderId: 'r1',
      distance: 100,
      assignedAt: new Date('2026-01-01T12:00:00Z'),
    });
    const now = new Date('2026-01-01T12:01:00Z'); // only 1 minute later

    const result = processTick(player, [rider], [order], now);

    expect(result.orders[0].status).toBe('assigned');
  });

  it('should expire available orders past their expiry', () => {
    const player = makePlayer();
    const order = makeOrder({
      expiresAt: new Date('2026-01-01T12:30:00Z'),
    });
    const now = new Date('2026-01-01T13:00:00Z');

    const result = processTick(player, [], [order], now);

    expect(result.orders[0].status).toBe('expired');
  });

  it('should not expire orders that are still valid', () => {
    const player = makePlayer();
    const order = makeOrder({
      expiresAt: new Date('2026-01-01T14:00:00Z'),
    });
    const now = new Date('2026-01-01T12:30:00Z');

    const result = processTick(player, [], [order], now);

    expect(result.orders[0].status).toBe('available');
  });

  it('should not mutate input objects', () => {
    const player = makePlayer();
    const riders = [makeRider()];
    const orders = [makeOrder()];
    const now = new Date('2026-01-01T13:00:00Z');

    const originalMoney = player.money;
    const originalEnergy = riders[0].energy;

    processTick(player, riders, orders, now);

    expect(player.money).toBe(originalMoney);
    expect(riders[0].energy).toBe(originalEnergy);
  });

  it('should complete multiple deliveries in one tick', () => {
    const player = makePlayer();
    const riders = [
      makeRider({ id: 'r1', status: 'delivering' }),
      makeRider({ id: 'r2', status: 'delivering' }),
    ];
    const orders = [
      makeOrder({
        id: 'o1',
        riderId: 'r1',
        status: 'assigned',
        assignedAt: new Date('2026-01-01T12:00:00Z'),
      }),
      makeOrder({
        id: 'o2',
        riderId: 'r2',
        status: 'assigned',
        assignedAt: new Date('2026-01-01T12:00:00Z'),
        distance: 3,
        reward: 7.5,
      }),
    ];
    const now = new Date('2026-01-01T13:00:00Z');

    const result = processTick(player, riders, orders, now);

    expect(result.orders.filter((o) => o.status === 'delivered')).toHaveLength(2);
    expect(result.riders.filter((r) => r.status === 'idle')).toHaveLength(2);
    expect(result.player.totalDeliveries).toBe(2);
    expect(result.revenue).toBeGreaterThan(0);
  });

  it('should allow money to go negative from salary costs', () => {
    const player = makePlayer({ money: 5 });
    const riders = [makeRider({ salary: 100 })];
    const now = new Date('2026-01-01T13:00:00Z'); // 1 hour

    const result = processTick(player, riders, [], now);

    expect(result.player.money).toBe(-95); // 5 - 100
    expect(result.costs).toBe(100);
  });

  it('should calculate net profit from revenue minus costs', () => {
    const player = makePlayer({ money: 500 });
    const riders = [makeRider({ id: 'r1', salary: 10, status: 'delivering' })];
    const orders = [
      makeOrder({
        riderId: 'r1',
        status: 'assigned',
        assignedAt: new Date('2026-01-01T12:00:00Z'),
        reward: 10.5,
      }),
    ];
    const now = new Date('2026-01-01T13:00:00Z');

    const result = processTick(player, riders, orders, now);

    expect(result.revenue).toBe(10.5);
    expect(result.costs).toBe(10);
    expect(result.player.money).toBe(500.5); // 500 + 10.5 - 10
    expect(result.player.totalProfit).toBe(0.5);
  });

  it('should track totalProfit cumulatively', () => {
    const player = makePlayer({ totalProfit: 100 });
    const riders = [makeRider({ id: 'r1', status: 'delivering', salary: 5 })];
    const orders = [
      makeOrder({
        riderId: 'r1',
        status: 'assigned',
        assignedAt: new Date('2026-01-01T12:00:00Z'),
        reward: 10.5,
      }),
    ];
    const now = new Date('2026-01-01T13:00:00Z');

    const result = processTick(player, riders, orders, now);

    expect(result.player.totalProfit).toBe(105.5); // 100 + 10.5 - 5
  });
});
