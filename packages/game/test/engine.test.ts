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
    expect(result.newOrderCount).toBe(0);
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

describe('processTick — order generation', () => {
  it('should generate new orders based on elapsed time', () => {
    const player = makePlayer(); // level 1, reputation 50
    const now = new Date('2026-01-01T13:00:00Z'); // 1 hour later

    const result = processTick(player, [], [], now);

    // orderRate = (2 + 1*0.5) * (1 + 50/100) = 2.5 * 1.5 = 3.75 → floor = 3
    // maxOrders = 5 + 1 = 6, available = 0 → min(3, 6) = 3
    expect(result.newOrderCount).toBe(3);
  });

  it('should not exceed max available orders', () => {
    const player = makePlayer();
    // Already have 5 available orders, max is 6 for level 1
    const existingOrders = Array.from({ length: 5 }, (_, i) =>
      makeOrder({ id: `o${i}`, expiresAt: new Date('2026-01-01T14:00:00Z') }),
    );
    const now = new Date('2026-01-01T13:00:00Z');

    const result = processTick(player, [], existingOrders, now);

    expect(result.newOrderCount).toBe(1); // max 6 - 5 existing = 1
  });

  it('should generate zero orders if board is full', () => {
    const player = makePlayer();
    const existingOrders = Array.from({ length: 6 }, (_, i) =>
      makeOrder({ id: `o${i}`, expiresAt: new Date('2026-01-01T14:00:00Z') }),
    );
    const now = new Date('2026-01-01T13:00:00Z');

    const result = processTick(player, [], existingOrders, now);

    expect(result.newOrderCount).toBe(0);
  });

  it('should generate more orders at higher levels', () => {
    const player = makePlayer({ level: 10, reputation: 80 });
    const now = new Date('2026-01-01T13:00:00Z');

    const result = processTick(player, [], [], now);

    // orderRate = (2 + 10*0.5) * (1 + 80/100) = 7 * 1.8 = 12.6 → floor = 12
    // maxOrders = 5 + 10 = 15 → min(12, 15) = 12
    expect(result.newOrderCount).toBe(12);
  });

  it('should account for expired orders freeing up slots', () => {
    const player = makePlayer();
    // 5 orders but 3 will expire during tick
    const existingOrders = [
      makeOrder({ id: 'o1', expiresAt: new Date('2026-01-01T12:10:00Z') }), // expires
      makeOrder({ id: 'o2', expiresAt: new Date('2026-01-01T12:15:00Z') }), // expires
      makeOrder({ id: 'o3', expiresAt: new Date('2026-01-01T12:20:00Z') }), // expires
      makeOrder({ id: 'o4', expiresAt: new Date('2026-01-01T14:00:00Z') }), // stays
      makeOrder({ id: 'o5', expiresAt: new Date('2026-01-01T14:00:00Z') }), // stays
    ];
    const now = new Date('2026-01-01T13:00:00Z');

    const result = processTick(player, [], existingOrders, now);

    // 3 expired, 2 remaining available, max 6 → could arrive 3, slots 4 → min(3, 4) = 3
    expect(result.newOrderCount).toBe(3);
  });
});

describe('processTick — delivery failure', () => {
  it('should fail delivery when roll is below failure chance', () => {
    const player = makePlayer();
    // Order id "0" → seededRandom = 0.0048, will fail for any non-zero failure chance
    const rider = makeRider({ id: 'r1', reliability: 5, cityKnowledge: 5, status: 'delivering' });
    const order = makeOrder({
      id: '0',
      status: 'assigned',
      riderId: 'r1',
      assignedAt: new Date('2026-01-01T12:00:00Z'),
    });
    const now = new Date('2026-01-01T13:00:00Z');

    const result = processTick(player, [rider], [order], now);

    expect(result.orders[0].status).toBe('failed');
    expect(result.failedDeliveries).toBe(1);
    expect(result.revenue).toBe(0);
    expect(result.riders[0].status).toBe('idle');
  });

  it('should succeed delivery when roll is above failure chance', () => {
    const player = makePlayer();
    // Order id "o1" → seededRandom = 0.349, well above any reasonable failure chance
    const rider = makeRider({ id: 'r1', reliability: 5, cityKnowledge: 5, status: 'delivering' });
    const order = makeOrder({
      id: 'o1',
      status: 'assigned',
      riderId: 'r1',
      assignedAt: new Date('2026-01-01T12:00:00Z'),
    });
    const now = new Date('2026-01-01T13:00:00Z');

    const result = processTick(player, [rider], [order], now);

    expect(result.orders[0].status).toBe('delivered');
    expect(result.failedDeliveries).toBe(0);
    expect(result.revenue).toBeGreaterThan(0);
  });

  it('should never fail with max reliability and knowledge', () => {
    const player = makePlayer();
    const rider = makeRider({
      id: 'r1',
      reliability: 10,
      cityKnowledge: 10,
      status: 'delivering',
    });
    const order = makeOrder({
      id: '0', // lowest roll
      status: 'assigned',
      riderId: 'r1',
      assignedAt: new Date('2026-01-01T12:00:00Z'),
    });
    const now = new Date('2026-01-01T13:00:00Z');

    const result = processTick(player, [rider], [order], now);

    expect(result.orders[0].status).toBe('delivered');
  });

  it('should decrease reputation on failure', () => {
    const player = makePlayer({ reputation: 50 });
    const rider = makeRider({ id: 'r1', reliability: 5, cityKnowledge: 5, status: 'delivering' });
    const order = makeOrder({
      id: '0', // will fail
      status: 'assigned',
      riderId: 'r1',
      assignedAt: new Date('2026-01-01T12:00:00Z'),
    });
    const now = new Date('2026-01-01T13:00:00Z');

    const result = processTick(player, [rider], [order], now);

    expect(result.player.reputation).toBeLessThan(50);
  });

  it('should increase reputation on success', () => {
    const player = makePlayer({ reputation: 50 });
    const rider = makeRider({ id: 'r1', reliability: 5, cityKnowledge: 5, status: 'delivering' });
    const order = makeOrder({
      id: 'o1', // will succeed
      status: 'assigned',
      riderId: 'r1',
      assignedAt: new Date('2026-01-01T12:00:00Z'),
    });
    const now = new Date('2026-01-01T13:00:00Z');

    const result = processTick(player, [rider], [order], now);

    expect(result.player.reputation).toBeGreaterThan(50);
  });
});
