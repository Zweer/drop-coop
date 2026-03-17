import { describe, expect, it } from 'vitest';

import { MIN_RIDERS_FOR_VOTE, mergePolicyEffects, POLICIES, simulateVote } from '../src/coop.js';

describe('POLICIES', () => {
  it('should have 3 policy types', () => {
    expect(POLICIES).toHaveLength(3);
  });

  it('each policy should have 2 options', () => {
    for (const p of POLICIES) {
      expect(p.options).toHaveLength(2);
    }
  });

  it('MIN_RIDERS_FOR_VOTE should be 3', () => {
    expect(MIN_RIDERS_FOR_VOTE).toBe(3);
  });
});

describe('mergePolicyEffects', () => {
  it('should return neutral modifiers for default policies', () => {
    const mods = mergePolicyEffects([
      { type: 'pay_structure', option: 'equal_split' },
      { type: 'work_hours', option: 'standard' },
      { type: 'equipment_budget', option: 'basic' },
    ]);
    expect(mods.speedMultiplier).toBe(1);
    expect(mods.rewardMultiplier).toBe(1);
    expect(mods.orderRateMultiplier).toBe(1);
    expect(mods.upgradeCostMultiplier).toBe(1);
  });

  it('should apply performance_based reward bonus', () => {
    const mods = mergePolicyEffects([{ type: 'pay_structure', option: 'performance_based' }]);
    expect(mods.rewardMultiplier).toBe(1.15);
    expect(mods.speedMultiplier).toBe(1);
  });

  it('should apply extended hours effects', () => {
    const mods = mergePolicyEffects([{ type: 'work_hours', option: 'extended' }]);
    expect(mods.orderRateMultiplier).toBe(1.3);
    expect(mods.speedMultiplier).toBe(0.9);
  });

  it('should apply premium equipment effects', () => {
    const mods = mergePolicyEffects([{ type: 'equipment_budget', option: 'premium' }]);
    expect(mods.speedMultiplier).toBe(1.1);
    expect(mods.upgradeCostMultiplier).toBe(1.2);
  });

  it('should combine multiple policies', () => {
    const mods = mergePolicyEffects([
      { type: 'work_hours', option: 'extended' },
      { type: 'equipment_budget', option: 'premium' },
    ]);
    // speed: 0.9 * 1.1 = 0.99
    expect(mods.speedMultiplier).toBeCloseTo(0.99);
    expect(mods.orderRateMultiplier).toBe(1.3);
    expect(mods.upgradeCostMultiplier).toBe(1.2);
  });

  it('should return neutral for empty policies', () => {
    const mods = mergePolicyEffects([]);
    expect(mods.speedMultiplier).toBe(1);
  });
});

describe('simulateVote', () => {
  const highStatRider = { speed: 8, reliability: 7, cityKnowledge: 8, stamina: 7, morale: 70 };
  const lowStatRider = { speed: 3, reliability: 3, cityKnowledge: 4, stamina: 3, morale: 40 };

  it('high-stat riders should prefer performance_based pay', () => {
    const result = simulateVote(
      [highStatRider, highStatRider, highStatRider],
      'pay_structure',
      'equal_split',
    );
    expect(result.winner).toBe('performance_based');
    expect(result.votes.performance_based).toBe(3);
  });

  it('low-stat riders should prefer equal_split pay', () => {
    const result = simulateVote(
      [lowStatRider, lowStatRider, lowStatRider],
      'pay_structure',
      'equal_split',
    );
    expect(result.winner).toBe('equal_split');
    expect(result.votes.equal_split).toBe(3);
  });

  it('high-morale riders should tolerate extended hours', () => {
    const result = simulateVote(
      [highStatRider, highStatRider, highStatRider],
      'work_hours',
      'standard',
    );
    expect(result.winner).toBe('extended');
  });

  it('low-morale riders should prefer standard hours', () => {
    const result = simulateVote(
      [lowStatRider, lowStatRider, lowStatRider],
      'work_hours',
      'standard',
    );
    expect(result.winner).toBe('standard');
  });

  it('low-speed riders should prefer premium equipment', () => {
    const result = simulateVote(
      [lowStatRider, lowStatRider, lowStatRider],
      'equipment_budget',
      'basic',
    );
    expect(result.winner).toBe('premium');
  });

  it('tie should keep current option', () => {
    // 2 riders: 1 high, 1 low → tie
    const result = simulateVote([highStatRider, lowStatRider], 'pay_structure', 'equal_split');
    expect(result.winner).toBe('equal_split');
  });

  it('should return current option for invalid policy type', () => {
    const result = simulateVote([highStatRider], 'invalid' as never, 'equal_split');
    expect(result.winner).toBe('equal_split');
  });
});
