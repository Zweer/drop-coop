import type { Order, OrderUrgency, Rider } from './types.js';

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
