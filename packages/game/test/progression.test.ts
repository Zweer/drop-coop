import { describe, expect, it } from 'vitest';

import {
  calculateLevel,
  deliveriesForLevel,
  getProgression,
  MILESTONES,
} from '../src/progression.js';

describe('deliveriesForLevel', () => {
  it('should be 0 for level 1', () => {
    expect(deliveriesForLevel(1)).toBe(0);
  });

  it('should increase with level', () => {
    expect(deliveriesForLevel(2)).toBeLessThan(deliveriesForLevel(3));
    expect(deliveriesForLevel(5)).toBeLessThan(deliveriesForLevel(10));
  });

  it('should match expected early values', () => {
    expect(deliveriesForLevel(2)).toBe(3);
    expect(deliveriesForLevel(3)).toBe(8);
    expect(deliveriesForLevel(5)).toBe(24);
  });
});

describe('calculateLevel', () => {
  it('should be level 1 with 0 deliveries', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it('should be level 2 with 3 deliveries', () => {
    expect(calculateLevel(3)).toBe(2);
  });

  it('should be level 2 with 7 deliveries (not yet level 3)', () => {
    expect(calculateLevel(7)).toBe(2);
  });

  it('should be level 3 with 8 deliveries', () => {
    expect(calculateLevel(8)).toBe(3);
  });

  it('should handle high delivery counts', () => {
    expect(calculateLevel(1000)).toBeGreaterThan(20);
  });
});

describe('getProgression', () => {
  it('should return correct progression for new player', () => {
    const p = getProgression({ level: 1, totalDeliveries: 0 });

    expect(p.level).toBe(1);
    expect(p.progressPercent).toBe(0);
    expect(p.deliveriesForNextLevel).toBe(3);
    expect(p.unlockedMilestones).toHaveLength(1);
    expect(p.nextMilestone?.level).toBe(3);
  });

  it('should show progress toward next level', () => {
    const p = getProgression({ level: 2, totalDeliveries: 5 });

    // Level 2 starts at 3, level 3 at 8 → range 5, progress 2
    expect(p.progressPercent).toBe(40);
  });

  it('should include unlocked milestones', () => {
    const p = getProgression({ level: 10, totalDeliveries: 100 });

    const unlockedLevels = p.unlockedMilestones.map((m) => m.level);
    expect(unlockedLevels).toContain(1);
    expect(unlockedLevels).toContain(5);
    expect(unlockedLevels).toContain(10);
    expect(unlockedLevels).not.toContain(15);
  });

  it('should show next milestone', () => {
    const p = getProgression({ level: 5, totalDeliveries: 30 });

    expect(p.nextMilestone?.level).toBe(8);
    expect(p.nextMilestone?.name).toBe('Expanding');
  });

  it('should return null nextMilestone when all unlocked', () => {
    const maxLevel = MILESTONES[MILESTONES.length - 1].level;
    const p = getProgression({ level: maxLevel, totalDeliveries: 9999 });

    expect(p.nextMilestone).toBeNull();
  });
});
