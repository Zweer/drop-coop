import { describe, expect, it } from 'vitest';

import {
  calculateDeliveryMinutes,
  calculateEnergyCost,
  calculateFailureChance,
  calculateMaxOrders,
  calculateOrderRate,
  calculateRevenue,
  calculateSalaryCost,
  calculateUpgradeCost,
  isUpgradeableStat,
  seededRandom,
} from '../src/economy.js';

describe('calculateRevenue', () => {
  it('should calculate normal delivery revenue', () => {
    expect(calculateRevenue({ distance: 5, urgency: 'normal' })).toBe(10.5);
  });

  it('should apply urgent multiplier (1.5x)', () => {
    expect(calculateRevenue({ distance: 5, urgency: 'urgent' })).toBe(15.75);
  });

  it('should apply express multiplier (2x)', () => {
    expect(calculateRevenue({ distance: 5, urgency: 'express' })).toBe(21);
  });

  it('should handle short distance', () => {
    expect(calculateRevenue({ distance: 1, urgency: 'normal' })).toBe(4.5);
  });
});

describe('calculateSalaryCost', () => {
  it('should sum salaries over elapsed hours', () => {
    const riders = [{ salary: 10 }, { salary: 15 }];
    expect(calculateSalaryCost(riders, 2)).toBe(50);
  });

  it('should return 0 for no riders', () => {
    expect(calculateSalaryCost([], 5)).toBe(0);
  });

  it('should return 0 for zero hours', () => {
    expect(calculateSalaryCost([{ salary: 10 }], 0)).toBe(0);
  });
});

describe('calculateDeliveryMinutes', () => {
  it('should decrease with higher speed', () => {
    const order = { distance: 5 };
    const slow = calculateDeliveryMinutes({ speed: 3, cityKnowledge: 1 }, order);
    const fast = calculateDeliveryMinutes({ speed: 8, cityKnowledge: 1 }, order);
    expect(fast).toBeLessThan(slow);
  });

  it('should decrease with higher city knowledge', () => {
    const order = { distance: 5 };
    const low = calculateDeliveryMinutes({ speed: 5, cityKnowledge: 2 }, order);
    const high = calculateDeliveryMinutes({ speed: 5, cityKnowledge: 8 }, order);
    expect(high).toBeLessThan(low);
  });

  it('should have a minimum of 5 minutes', () => {
    expect(calculateDeliveryMinutes({ speed: 10, cityKnowledge: 10 }, { distance: 0.1 })).toBe(5);
  });
});

describe('calculateEnergyCost', () => {
  it('should decrease with higher stamina', () => {
    const order = { distance: 5 };
    const low = calculateEnergyCost({ stamina: 2 }, order);
    const high = calculateEnergyCost({ stamina: 8 }, order);
    expect(high).toBeLessThan(low);
  });

  it('should have a minimum of 5', () => {
    expect(calculateEnergyCost({ stamina: 10 }, { distance: 0.1 })).toBe(5);
  });
});

describe('calculateOrderRate', () => {
  it('should increase with level', () => {
    const low = calculateOrderRate({ level: 1, reputation: 50 });
    const high = calculateOrderRate({ level: 10, reputation: 50 });
    expect(high).toBeGreaterThan(low);
  });

  it('should increase with reputation', () => {
    const low = calculateOrderRate({ level: 5, reputation: 20 });
    const high = calculateOrderRate({ level: 5, reputation: 80 });
    expect(high).toBeGreaterThan(low);
  });
});

describe('calculateMaxOrders', () => {
  it('should be 6 at level 1', () => {
    expect(calculateMaxOrders({ level: 1 })).toBe(6);
  });

  it('should cap at 20', () => {
    expect(calculateMaxOrders({ level: 100 })).toBe(20);
  });
});

describe('calculateFailureChance', () => {
  it('should be 0 for max stats', () => {
    expect(calculateFailureChance({ reliability: 10, cityKnowledge: 10 })).toBe(0);
  });

  it('should increase with lower reliability', () => {
    const low = calculateFailureChance({ reliability: 3, cityKnowledge: 5 });
    const high = calculateFailureChance({ reliability: 8, cityKnowledge: 5 });
    expect(low).toBeGreaterThan(high);
  });

  it('should increase with lower city knowledge', () => {
    const low = calculateFailureChance({ reliability: 5, cityKnowledge: 3 });
    const high = calculateFailureChance({ reliability: 5, cityKnowledge: 8 });
    expect(low).toBeGreaterThan(high);
  });

  it('should cap at 0.5', () => {
    expect(calculateFailureChance({ reliability: 1, cityKnowledge: 1 })).toBe(0.27);
  });
});

describe('seededRandom', () => {
  it('should return consistent results for same seed', () => {
    expect(seededRandom('test-123')).toBe(seededRandom('test-123'));
  });

  it('should return different results for different seeds', () => {
    expect(seededRandom('seed-a')).not.toBe(seededRandom('seed-b'));
  });

  it('should return value in [0, 1)', () => {
    const val = seededRandom('anything');
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThan(1);
  });
});

describe('calculateUpgradeCost', () => {
  it('should cost more for higher stats', () => {
    expect(calculateUpgradeCost(3)).toBe(90);
    expect(calculateUpgradeCost(5)).toBe(150);
    expect(calculateUpgradeCost(9)).toBe(270);
  });
});

describe('isUpgradeableStat', () => {
  it('should accept valid stats', () => {
    expect(isUpgradeableStat('speed')).toBe(true);
    expect(isUpgradeableStat('reliability')).toBe(true);
    expect(isUpgradeableStat('cityKnowledge')).toBe(true);
    expect(isUpgradeableStat('stamina')).toBe(true);
  });

  it('should reject invalid stats', () => {
    expect(isUpgradeableStat('energy')).toBe(false);
    expect(isUpgradeableStat('morale')).toBe(false);
    expect(isUpgradeableStat('foo')).toBe(false);
  });
});
