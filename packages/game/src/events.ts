import { seededRandom } from './economy.js';
import type { EventType, TickModifiers } from './types.js';

export interface EventDefinition {
  type: EventType;
  name: string;
  emoji: string;
  description: string;
  /** Duration range in hours [min, max]. */
  durationRange: [number, number];
  /** Whether this event targets a specific zone. */
  zoneSpecific: boolean;
  effects: Partial<TickModifiers>;
}

export const EVENT_CATALOG: EventDefinition[] = [
  {
    type: 'rainstorm',
    name: 'Rainstorm',
    emoji: '🌧️',
    description: 'Heavy rain slows riders but customers tip more.',
    durationRange: [2, 4],
    zoneSpecific: false,
    effects: { speedMultiplier: 0.7, rewardMultiplier: 1.5 },
  },
  {
    type: 'food_festival',
    name: 'Food Festival',
    emoji: '🎉',
    description: 'A local food festival triples order volume!',
    durationRange: [12, 24],
    zoneSpecific: true,
    effects: { orderRateMultiplier: 3.0 },
  },
  {
    type: 'bike_lane_closure',
    name: 'Bike Lane Closure',
    emoji: '🚧',
    description: 'Road works force riders to take detours.',
    durationRange: [24, 72],
    zoneSpecific: true,
    effects: { speedMultiplier: 0.5 },
  },
  {
    type: 'viral_review',
    name: 'Viral Review',
    emoji: '📱',
    description: 'A viral social media post doubles incoming orders!',
    durationRange: [12, 24],
    zoneSpecific: false,
    effects: { orderRateMultiplier: 2.0 },
  },
  {
    type: 'equipment_sale',
    name: 'Equipment Sale',
    emoji: '🏷️',
    description: 'A bike shop sale cuts upgrade costs in half!',
    durationRange: [12, 24],
    zoneSpecific: false,
    effects: { upgradeCostMultiplier: 0.5 },
  },
];

export function getEventDefinition(type: EventType): EventDefinition {
  const def = EVENT_CATALOG.find((e) => e.type === type);
  if (!def) throw new Error(`Unknown event type: ${type}`);
  return def;
}

const DEFAULT_MODIFIERS: TickModifiers = {
  speedMultiplier: 1,
  rewardMultiplier: 1,
  orderRateMultiplier: 1,
  upgradeCostMultiplier: 1,
};

/** Merge effects from multiple active events into a single modifier set. */
export function mergeEventEffects(eventTypes: EventType[]): TickModifiers {
  return eventTypes.reduce<TickModifiers>(
    (mods, type) => {
      const def = getEventDefinition(type);
      return {
        speedMultiplier: mods.speedMultiplier * (def.effects.speedMultiplier ?? 1),
        rewardMultiplier: mods.rewardMultiplier * (def.effects.rewardMultiplier ?? 1),
        orderRateMultiplier: mods.orderRateMultiplier * (def.effects.orderRateMultiplier ?? 1),
        upgradeCostMultiplier:
          mods.upgradeCostMultiplier * (def.effects.upgradeCostMultiplier ?? 1),
      };
    },
    { ...DEFAULT_MODIFIERS },
  );
}

/** Average chance of a new event per hour. Scales with player level. */
const BASE_EVENT_CHANCE_PER_HOUR = 0.08;

/**
 * Determine how many new events should spawn given elapsed time.
 * Returns event types to create (may be 0).
 */
export function rollNewEvents(
  elapsedHours: number,
  playerLevel: number,
  activeEventTypes: EventType[],
  seed: string,
): EventType[] {
  if (playerLevel < 3) return [];

  const chance = BASE_EVENT_CHANCE_PER_HOUR * elapsedHours * (1 + playerLevel * 0.02);
  const roll = seededRandom(seed);
  if (roll >= chance) return [];

  // Pick a random event not already active
  const available = EVENT_CATALOG.filter((e) => !activeEventTypes.includes(e.type));
  if (available.length === 0) return [];

  const idx = Math.floor(seededRandom(`${seed}:pick`) * available.length);
  return [available[idx].type];
}
