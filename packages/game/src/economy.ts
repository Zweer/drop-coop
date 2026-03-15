import type { Order, OrderUrgency, Player, Rider } from './types.js';

const BASE_RATE = 3;
const PER_KM_RATE = 1.5;

const URGENCY_MULTIPLIER: Record<OrderUrgency, number> = {
  normal: 1.0,
  urgent: 1.5,
  express: 2.0,
};

/** Revenue from a completed delivery. */
export function calculateRevenue(order: Pick<Order, 'distance' | 'urgency'>): number {
  return (BASE_RATE + order.distance * PER_KM_RATE) * URGENCY_MULTIPLIER[order.urgency];
}

/** Salary cost for a set of riders over elapsed hours. */
export function calculateSalaryCost(riders: Pick<Rider, 'salary'>[], elapsedHours: number): number {
  return riders.reduce((sum, r) => sum + r.salary * elapsedHours, 0);
}

/** Estimated delivery time in minutes based on rider speed and order distance. */
export function calculateDeliveryMinutes(
  rider: Pick<Rider, 'speed' | 'cityKnowledge'>,
  order: Pick<Order, 'distance'>,
): number {
  const baseMinutes = (order.distance / rider.speed) * 30;
  const knowledgeBonus = 1 - rider.cityKnowledge * 0.05;
  return Math.max(5, baseMinutes * knowledgeBonus);
}

/** Energy cost for a delivery. */
export function calculateEnergyCost(
  rider: Pick<Rider, 'stamina'>,
  order: Pick<Order, 'distance'>,
): number {
  const baseCost = order.distance * 5;
  const staminaReduction = 1 - rider.stamina * 0.05;
  return Math.max(5, baseCost * staminaReduction);
}

/** Orders per hour based on player level and reputation. */
export function calculateOrderRate(player: Pick<Player, 'level' | 'reputation'>): number {
  const base = 2 + player.level * 0.5;
  const reputationBonus = player.reputation / 100;
  return base * (1 + reputationBonus);
}

/** Max available orders at once based on player level. */
export function calculateMaxOrders(player: Pick<Player, 'level'>): number {
  return Math.min(5 + player.level, 20);
}

/**
 * Chance of delivery failure (0-1) based on rider stats.
 * - Low reliability → higher base failure
 * - Low city knowledge → chance of getting lost
 */
export function calculateFailureChance(
  rider: Pick<Rider, 'reliability' | 'cityKnowledge'>,
): number {
  const reliabilityRisk = (10 - rider.reliability) * 0.02;
  const knowledgeRisk = (10 - rider.cityKnowledge) * 0.01;
  return Math.min(0.5, reliabilityRisk + knowledgeRisk);
}

/** Deterministic hash of a string to a number in [0, 1). */
export function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return ((h >>> 0) % 10000) / 10000;
}

const UPGRADE_BASE_COST = 30;
const UPGRADEABLE_STATS = ['speed', 'reliability', 'cityKnowledge', 'stamina'] as const;
export type UpgradeableStat = (typeof UPGRADEABLE_STATS)[number];

/** Cost to upgrade a rider stat from its current value. */
export function calculateUpgradeCost(currentValue: number): number {
  return UPGRADE_BASE_COST * currentValue;
}

/** Check if a stat name is upgradeable. */
export function isUpgradeableStat(stat: string): stat is UpgradeableStat {
  return (UPGRADEABLE_STATS as readonly string[]).includes(stat);
}
