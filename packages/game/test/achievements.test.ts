import { describe, expect, it } from 'vitest';

import type { AchievementInput } from '../src/achievements.js';
import { ACHIEVEMENTS, checkAchievements } from '../src/achievements.js';

const base: AchievementInput = {
  totalDeliveries: 0,
  money: 0,
  totalProfit: 0,
  level: 1,
  riderCount: 0,
  unlockedZoneCount: 1,
  unlockedCityCount: 1,
  discoveredEndpoints: 0,
  maxRiderStat: 5,
  hasUsedBatch: false,
  hasUsedAnalytics: false,
  hasUsedPipeline: false,
  hasVoted: false,
};

describe('Achievements', () => {
  it('should export all achievement definitions', () => {
    expect(ACHIEVEMENTS.length).toBe(22);
    for (const a of ACHIEVEMENTS) {
      expect(a.id).toBeTruthy();
      expect(a.name).toBeTruthy();
      expect(a.icon).toBeTruthy();
      expect(a.description).toBeTruthy();
    }
  });

  it('should return nothing for fresh player', () => {
    expect(checkAchievements(base, new Set())).toEqual([]);
  });

  it('should unlock delivery milestones', () => {
    const r1 = checkAchievements({ ...base, totalDeliveries: 1 }, new Set());
    expect(r1).toContain('first_delivery');

    const r50 = checkAchievements({ ...base, totalDeliveries: 50 }, new Set());
    expect(r50).toContain('deliveries_50');

    const r200 = checkAchievements({ ...base, totalDeliveries: 200 }, new Set());
    expect(r200).toContain('deliveries_200');

    const r1000 = checkAchievements({ ...base, totalDeliveries: 1000 }, new Set());
    expect(r1000).toContain('deliveries_1000');
  });

  it('should unlock economy achievements', () => {
    const r = checkAchievements({ ...base, money: 1000 }, new Set());
    expect(r).toContain('rich_1000');

    const r2 = checkAchievements({ ...base, totalProfit: 10000 }, new Set());
    expect(r2).toContain('profit_10000');

    const r3 = checkAchievements({ ...base, totalProfit: 100000 }, new Set());
    expect(r3).toContain('profit_100000');
  });

  it('should unlock rider achievements', () => {
    const r = checkAchievements({ ...base, riderCount: 1 }, new Set());
    expect(r).toContain('first_hire');

    const r10 = checkAchievements({ ...base, riderCount: 10 }, new Set());
    expect(r10).toContain('riders_10');

    const rMax = checkAchievements({ ...base, maxRiderStat: 10 }, new Set());
    expect(rMax).toContain('max_stat');
  });

  it('should unlock expansion achievements', () => {
    const r = checkAchievements({ ...base, unlockedZoneCount: 2 }, new Set());
    expect(r).toContain('second_zone');

    const r5 = checkAchievements({ ...base, unlockedZoneCount: 5 }, new Set());
    expect(r5).toContain('all_milan');

    const rCity = checkAchievements({ ...base, unlockedCityCount: 2 }, new Set());
    expect(rCity).toContain('second_city');

    const rAll = checkAchievements({ ...base, unlockedCityCount: 4 }, new Set());
    expect(rAll).toContain('all_cities');
  });

  it('should unlock hacker achievements', () => {
    const r = checkAchievements({ ...base, discoveredEndpoints: 5 }, new Set());
    expect(r).toContain('api_explorer');

    const r15 = checkAchievements({ ...base, discoveredEndpoints: 15 }, new Set());
    expect(r15).toContain('api_hacker');

    const rBatch = checkAchievements({ ...base, hasUsedBatch: true }, new Set());
    expect(rBatch).toContain('batch_user');

    const rAnalytics = checkAchievements({ ...base, hasUsedAnalytics: true }, new Set());
    expect(rAnalytics).toContain('analytics_user');

    const rPipeline = checkAchievements({ ...base, hasUsedPipeline: true }, new Set());
    expect(rPipeline).toContain('pipeline_user');
  });

  it('should unlock coop and level achievements', () => {
    const r = checkAchievements({ ...base, hasVoted: true }, new Set());
    expect(r).toContain('first_vote');

    const r20 = checkAchievements({ ...base, level: 20 }, new Set());
    expect(r20).toContain('level_20');

    const r50 = checkAchievements({ ...base, level: 50 }, new Set());
    expect(r50).toContain('level_50');
  });

  it('should skip already unlocked achievements', () => {
    const input = { ...base, totalDeliveries: 1, riderCount: 1 };
    const already = new Set(['first_delivery']);
    const r = checkAchievements(input, already);
    expect(r).not.toContain('first_delivery');
    expect(r).toContain('first_hire');
  });

  it('should unlock multiple achievements at once', () => {
    const input = { ...base, totalDeliveries: 1000, money: 1000, riderCount: 10, level: 50 };
    const r = checkAchievements(input, new Set());
    expect(r.length).toBeGreaterThan(5);
  });
});
