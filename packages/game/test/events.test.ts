import { describe, expect, it } from 'vitest';

import {
  BASE_EVENT_CHANCE_PER_HOUR,
  EVENT_CATALOG,
  getEventDefinition,
  mergeEventEffects,
  rollNewEvents,
} from '../src/events.js';
import type { EventType } from '../src/types.js';

describe('EVENT_CATALOG', () => {
  it('should have 5 event types', () => {
    expect(EVENT_CATALOG).toHaveLength(5);
  });

  it('each event should have required fields', () => {
    for (const e of EVENT_CATALOG) {
      expect(e.type).toBeTruthy();
      expect(e.name).toBeTruthy();
      expect(e.emoji).toBeTruthy();
      expect(e.durationRange).toHaveLength(2);
      expect(e.durationRange[0]).toBeLessThanOrEqual(e.durationRange[1]);
      expect(e.effects).toBeDefined();
    }
  });
});

describe('getEventDefinition', () => {
  it('should return definition for known type', () => {
    const def = getEventDefinition('rainstorm');
    expect(def.name).toBe('Rainstorm');
    expect(def.effects.speedMultiplier).toBe(0.7);
  });

  it('should throw for unknown type', () => {
    expect(() => getEventDefinition('tornado' as EventType)).toThrow('Unknown event type');
  });
});

describe('mergeEventEffects', () => {
  it('should return defaults for empty array', () => {
    const mods = mergeEventEffects([]);
    expect(mods.speedMultiplier).toBe(1);
    expect(mods.rewardMultiplier).toBe(1);
    expect(mods.orderRateMultiplier).toBe(1);
    expect(mods.upgradeCostMultiplier).toBe(1);
  });

  it('should apply single event effects', () => {
    const mods = mergeEventEffects(['rainstorm']);
    expect(mods.speedMultiplier).toBe(0.7);
    expect(mods.rewardMultiplier).toBe(1.5);
    expect(mods.orderRateMultiplier).toBe(1);
  });

  it('should multiply effects from multiple events', () => {
    const mods = mergeEventEffects(['rainstorm', 'food_festival']);
    expect(mods.speedMultiplier).toBe(0.7);
    expect(mods.rewardMultiplier).toBe(1.5);
    expect(mods.orderRateMultiplier).toBe(3.0);
  });

  it('should apply equipment sale discount', () => {
    const mods = mergeEventEffects(['equipment_sale']);
    expect(mods.upgradeCostMultiplier).toBe(0.5);
  });
});

describe('rollNewEvents', () => {
  it('should return empty for low level players', () => {
    expect(rollNewEvents(10, 2, [], 'seed')).toEqual([]);
  });

  it('should return empty when roll is too high', () => {
    // With very short elapsed time, chance is tiny
    const result = rollNewEvents(0.001, 3, [], 'high-roll-seed');
    expect(result).toEqual([]);
  });

  it('should return event when conditions are met', () => {
    // High elapsed time + high level = high chance
    // Try many seeds to find one that triggers
    let found = false;
    for (let i = 0; i < 100; i++) {
      const result = rollNewEvents(100, 50, [], `seed-${i}`);
      if (result.length > 0) {
        expect(EVENT_CATALOG.map((e) => e.type)).toContain(result[0]);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('should not return already active event types', () => {
    const allTypes = EVENT_CATALOG.map((e) => e.type);
    for (let i = 0; i < 50; i++) {
      const result = rollNewEvents(100, 50, allTypes.slice(0, 4), `seed-${i}`);
      if (result.length > 0) {
        expect(result[0]).toBe(allTypes[4]); // only one left
      }
    }
  });

  it('should return empty when all events are active', () => {
    const allTypes = EVENT_CATALOG.map((e) => e.type);
    const result = rollNewEvents(100, 50, allTypes, 'any-seed');
    expect(result).toEqual([]);
  });
});

describe('BASE_EVENT_CHANCE_PER_HOUR', () => {
  it('should be a positive number', () => {
    expect(BASE_EVENT_CHANCE_PER_HOUR).toBeGreaterThan(0);
    expect(BASE_EVENT_CHANCE_PER_HOUR).toBeLessThan(1);
  });
});
