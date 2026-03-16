import { describe, expect, it } from 'vitest';

import { ZONES } from '../src/zones.js';

describe('ZONES', () => {
  it('should have 5 zones', () => {
    expect(ZONES).toHaveLength(5);
  });

  it('centro should be free and level 1', () => {
    const centro = ZONES.find((z) => z.slug === 'centro');
    expect(centro).toBeDefined();
    expect(centro?.unlockCost).toBe(0);
    expect(centro?.requiredLevel).toBe(1);
    expect(centro?.hourlyFee).toBe(0);
  });

  it('each zone should have valid distance range', () => {
    for (const z of ZONES) {
      expect(z.distanceRange[0]).toBeLessThan(z.distanceRange[1]);
      expect(z.distanceRange[0]).toBeGreaterThan(0);
    }
  });
});
