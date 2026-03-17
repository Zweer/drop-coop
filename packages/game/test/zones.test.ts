import { describe, expect, it } from 'vitest';

import { CITIES, ZONES } from '../src/zones.js';

describe('CITIES', () => {
  it('should have 4 cities', () => {
    expect(CITIES).toHaveLength(4);
  });

  it('milan should be the starter city (level 1)', () => {
    const milan = CITIES.find((c) => c.slug === 'milan');
    expect(milan).toBeDefined();
    expect(milan?.requiredLevel).toBe(1);
  });

  it('each city should have coordinates', () => {
    for (const c of CITIES) {
      expect(c.baseLat).toBeGreaterThan(0);
      expect(c.baseLng).toBeGreaterThan(0);
      expect(c.coordSpread).toBeGreaterThan(0);
    }
  });

  it('cities should require increasing levels', () => {
    const levels = CITIES.map((c) => c.requiredLevel);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]).toBeGreaterThan(levels[i - 1]);
    }
  });
});

describe('ZONES', () => {
  it('should have 14 zones across 4 cities', () => {
    expect(ZONES).toHaveLength(14);
  });

  it('every zone should belong to a valid city', () => {
    const citySlugs = new Set(CITIES.map((c) => c.slug));
    for (const z of ZONES) {
      expect(citySlugs.has(z.city)).toBe(true);
    }
  });

  it('centro should be free and level 1', () => {
    const centro = ZONES.find((z) => z.slug === 'centro');
    expect(centro).toBeDefined();
    expect(centro?.unlockCost).toBe(0);
    expect(centro?.requiredLevel).toBe(1);
    expect(centro?.hourlyFee).toBe(0);
    expect(centro?.city).toBe('milan');
  });

  it('each zone should have valid distance range', () => {
    for (const z of ZONES) {
      expect(z.distanceRange[0]).toBeLessThan(z.distanceRange[1]);
      expect(z.distanceRange[0]).toBeGreaterThan(0);
    }
  });

  it('milan should have 5 zones', () => {
    expect(ZONES.filter((z) => z.city === 'milan')).toHaveLength(5);
  });

  it('each non-milan city should have 3 zones', () => {
    for (const city of CITIES.filter((c) => c.slug !== 'milan')) {
      expect(ZONES.filter((z) => z.city === city.slug)).toHaveLength(3);
    }
  });
});
