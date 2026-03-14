import { describe, expect, it } from 'vitest';

import {
  calculateDeliveryMinutes,
  calculateEnergyCost,
  calculateRevenue,
  calculateSalaryCost,
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
