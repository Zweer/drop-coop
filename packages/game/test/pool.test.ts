import { describe, expect, it } from 'vitest';

import { generatePool, POOL_REFRESH_MS, poolSeed, poolTimeSlot } from '../src/pool.js';

describe('generatePool', () => {
  it('should generate 4 riders by default', () => {
    const pool = generatePool('test-seed');
    expect(pool).toHaveLength(4);
  });

  it('should generate custom count', () => {
    expect(generatePool('seed', 2)).toHaveLength(2);
  });

  it('should be deterministic for same seed', () => {
    const a = generatePool('same-seed');
    const b = generatePool('same-seed');
    expect(a).toEqual(b);
  });

  it('should differ for different seeds', () => {
    const a = generatePool('seed-a');
    const b = generatePool('seed-b');
    // At least one stat should differ
    const same = a.every(
      (r, i) =>
        r.speed === b[i].speed &&
        r.reliability === b[i].reliability &&
        r.cityKnowledge === b[i].cityKnowledge &&
        r.stamina === b[i].stamina,
    );
    expect(same).toBe(false);
  });

  it('each rider should have valid stats (3-7)', () => {
    const pool = generatePool('stat-check');
    for (const r of pool) {
      expect(r.speed).toBeGreaterThanOrEqual(3);
      expect(r.speed).toBeLessThanOrEqual(7);
      expect(r.reliability).toBeGreaterThanOrEqual(3);
      expect(r.reliability).toBeLessThanOrEqual(7);
      expect(r.cityKnowledge).toBeGreaterThanOrEqual(3);
      expect(r.cityKnowledge).toBeLessThanOrEqual(7);
      expect(r.stamina).toBeGreaterThanOrEqual(3);
      expect(r.stamina).toBeLessThanOrEqual(7);
    }
  });

  it('each rider should have positive hireCost and salary', () => {
    const pool = generatePool('cost-check');
    for (const r of pool) {
      expect(r.hireCost).toBeGreaterThan(0);
      expect(r.salary).toBeGreaterThan(0);
      expect(r.name).toBeTruthy();
    }
  });
});

describe('poolTimeSlot', () => {
  it('should return 0 for time 0', () => {
    expect(poolTimeSlot(0)).toBe(0);
  });

  it('should increment every POOL_REFRESH_MS', () => {
    expect(poolTimeSlot(POOL_REFRESH_MS)).toBe(1);
    expect(poolTimeSlot(POOL_REFRESH_MS * 3)).toBe(3);
  });

  it('should be same within one window', () => {
    expect(poolTimeSlot(1000)).toBe(poolTimeSlot(POOL_REFRESH_MS - 1));
  });
});

describe('poolSeed', () => {
  it('should include player ID and time slot', () => {
    const seed = poolSeed('player-1', 0);
    expect(seed).toContain('player-1');
    expect(seed).toContain('pool');
  });

  it('should differ for different players', () => {
    expect(poolSeed('a', 0)).not.toBe(poolSeed('b', 0));
  });

  it('should differ for different time slots', () => {
    expect(poolSeed('p', 0)).not.toBe(poolSeed('p', POOL_REFRESH_MS));
  });
});

describe('POOL_REFRESH_MS', () => {
  it('should be 4 hours in ms', () => {
    expect(POOL_REFRESH_MS).toBe(4 * 60 * 60 * 1000);
  });
});
