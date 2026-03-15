import { seededRandom } from './economy.js';

const NAMES = [
  'Marco',
  'Luca',
  'Sara',
  'Giulia',
  'Ahmed',
  'Yuki',
  'Chen',
  'Priya',
  'Diego',
  'Fatima',
  'Olga',
  'Jamal',
  'Ines',
  'Kofi',
  'Mei',
  'Ravi',
];

const HIRE_COST_BASE = 50;

/** Pool refresh interval in milliseconds (4 hours). */
export const POOL_REFRESH_MS = 4 * 60 * 60 * 1000;

export interface PoolRider {
  name: string;
  speed: number;
  reliability: number;
  cityKnowledge: number;
  stamina: number;
  hireCost: number;
  salary: number;
}

function seededStat(seed: string): number {
  return Math.floor(seededRandom(seed) * 5) + 3; // 3-7
}

/** Generate a deterministic rider pool for a given seed. */
export function generatePool(seed: string, count = 4): PoolRider[] {
  return Array.from({ length: count }, (_, i) => {
    const s = `${seed}:${i}`;
    const speed = seededStat(`${s}:spd`);
    const reliability = seededStat(`${s}:rel`);
    const cityKnowledge = seededStat(`${s}:ck`);
    const stamina = seededStat(`${s}:sta`);
    const avgStat = (speed + reliability + cityKnowledge + stamina) / 4;
    const nameIdx = Math.floor(seededRandom(`${s}:name`) * NAMES.length);
    return {
      name: NAMES[nameIdx],
      speed,
      reliability,
      cityKnowledge,
      stamina,
      hireCost: Math.round(HIRE_COST_BASE * (avgStat / 5)),
      salary: Math.round(avgStat * 2 * 10) / 10,
    };
  });
}

/** Get the time slot number for a given timestamp. */
export function poolTimeSlot(now: number): number {
  return Math.floor(now / POOL_REFRESH_MS);
}

/** Get the pool seed for a player at a given time. */
export function poolSeed(playerId: string, now: number): string {
  return `${playerId}:pool:${poolTimeSlot(now)}`;
}
