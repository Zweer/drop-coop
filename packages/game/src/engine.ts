import {
  calculateDeliveryMinutes,
  calculateDemandMultiplier,
  calculateFailureChance,
  calculateMaxOrders,
  calculateOrderRate,
  calculateRevenue,
  calculateSalaryCost,
  seededRandom,
} from './economy.js';
import { calculateLevel } from './progression.js';
import type { Order, Player, Rider, TickModifiers } from './types.js';

const ENERGY_REGEN_PER_HOUR = 10;
const REPUTATION_PER_DELIVERY = 0.5;
const REPUTATION_PER_FAILURE = -2;
const MORALE_PER_DELIVERY = 2;
const MORALE_PER_FAILURE = -5;
const MORALE_DRIFT_PER_HOUR = 1;
const MORALE_REST_PER_HOUR = 3;
const MORALE_BASELINE = 50;

const DEFAULT_MODIFIERS: TickModifiers = {
  speedMultiplier: 1,
  rewardMultiplier: 1,
  orderRateMultiplier: 1,
  upgradeCostMultiplier: 1,
};

export interface TickResult {
  player: Player;
  riders: Rider[];
  orders: Order[];
  revenue: number;
  costs: number;
  failedDeliveries: number;
  /** How many new orders the API layer should generate and insert. */
  newOrderCount: number;
  /** Reward multiplier to apply when generating new orders. */
  rewardMultiplier: number;
}

/**
 * Process a lazy tick: compute everything that happened between lastTickAt and now.
 * Pure function — returns new state without mutating inputs.
 */
export function processTick(
  player: Player,
  riders: Rider[],
  orders: Order[],
  now: Date,
  modifiers: TickModifiers = DEFAULT_MODIFIERS,
): TickResult {
  const elapsedMs = now.getTime() - player.lastTickAt.getTime();
  if (elapsedMs <= 0)
    return {
      player,
      riders,
      orders,
      revenue: 0,
      costs: 0,
      failedDeliveries: 0,
      newOrderCount: 0,
      rewardMultiplier: 1,
    };

  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  let revenue = 0;
  let failedDeliveries = 0;

  // 1. Complete or fail deliveries whose time has elapsed
  const updatedOrders = orders.map((order) => {
    if (order.status !== 'assigned' || !order.assignedAt) return order;

    const rider = riders.find((r) => r.id === order.riderId);
    if (!rider) return order;

    const deliveryMinutes = calculateDeliveryMinutes(rider, order) / modifiers.speedMultiplier;
    const doneAt = new Date(order.assignedAt.getTime() + deliveryMinutes * 60 * 1000);

    if (now >= doneAt) {
      const failChance = calculateFailureChance(rider);
      const roll = seededRandom(order.id);

      if (roll < failChance) {
        failedDeliveries++;
        return { ...order, status: 'failed' as const, deliveredAt: doneAt };
      }

      revenue += calculateRevenue(order);
      return { ...order, status: 'delivered' as const, deliveredAt: doneAt };
    }
    return order;
  });

  // 2. Expire available orders past their expiry
  const finalOrders = updatedOrders.map((order) => {
    if (order.status === 'available' && now >= order.expiresAt) {
      return { ...order, status: 'expired' as const };
    }
    return order;
  });

  // 3. Free up riders whose deliveries completed or failed
  const deliveredByRider = new Map<string, number>();
  const failedByRider = new Map<string, number>();
  for (const o of finalOrders) {
    if (!o.riderId || !o.deliveredAt || o.deliveredAt <= player.lastTickAt) continue;
    if (o.status === 'delivered')
      deliveredByRider.set(o.riderId, (deliveredByRider.get(o.riderId) ?? 0) + 1);
    if (o.status === 'failed')
      failedByRider.set(o.riderId, (failedByRider.get(o.riderId) ?? 0) + 1);
  }

  const doneRiderIds = new Set([...deliveredByRider.keys(), ...failedByRider.keys()]);

  // 4. Regenerate energy, update morale, update rider status
  const updatedRiders = riders.map((rider) => {
    const energyRegen =
      rider.status === 'resting' ? ENERGY_REGEN_PER_HOUR * 2 : ENERGY_REGEN_PER_HOUR;
    const newEnergy = Math.min(100, rider.energy + energyRegen * elapsedHours);
    const newStatus = doneRiderIds.has(rider.id) ? ('idle' as const) : rider.status;

    // Morale: delivery outcomes + drift toward baseline + rest bonus
    const deliveryBonus = (deliveredByRider.get(rider.id) ?? 0) * MORALE_PER_DELIVERY;
    const failurePenalty = (failedByRider.get(rider.id) ?? 0) * MORALE_PER_FAILURE;
    const drift =
      rider.morale < MORALE_BASELINE
        ? MORALE_DRIFT_PER_HOUR
        : rider.morale > MORALE_BASELINE
          ? -MORALE_DRIFT_PER_HOUR
          : 0;
    const restBonus = rider.status === 'resting' ? MORALE_REST_PER_HOUR : 0;
    const newMorale = Math.max(
      0,
      Math.min(
        100,
        rider.morale + deliveryBonus + failurePenalty + (drift + restBonus) * elapsedHours,
      ),
    );

    return { ...rider, energy: newEnergy, morale: newMorale, status: newStatus };
  });

  // 5. Deduct salary costs
  const costs = calculateSalaryCost(riders, elapsedHours);

  // 6. Update player
  const completedCount = finalOrders.filter(
    (o) => o.status === 'delivered' && o.deliveredAt && o.deliveredAt > player.lastTickAt,
  ).length;

  const newTotalDeliveries = player.totalDeliveries + completedCount;

  const updatedPlayer: Player = {
    ...player,
    money: player.money + revenue - costs,
    reputation: Math.max(
      0,
      Math.min(
        100,
        player.reputation +
          completedCount * REPUTATION_PER_DELIVERY +
          failedDeliveries * REPUTATION_PER_FAILURE,
      ),
    ),
    level: calculateLevel(newTotalDeliveries),
    totalDeliveries: newTotalDeliveries,
    totalProfit: player.totalProfit + revenue - costs,
    lastTickAt: now,
  };

  // 7. Calculate new orders to generate (with event + demand modifiers)
  const availableCount = finalOrders.filter((o) => o.status === 'available').length;
  const idleCount = updatedRiders.filter((r) => r.status === 'idle').length;
  const maxOrders = calculateMaxOrders(player);
  const baseRate = calculateOrderRate(player) * modifiers.orderRateMultiplier;
  const couldArrive = Math.floor(baseRate * elapsedHours);
  const newOrderCount = Math.max(0, Math.min(couldArrive, maxOrders - availableCount));

  // Reward multiplier: events + demand
  const demandMult = calculateDemandMultiplier(availableCount, idleCount);
  const rewardMultiplier = modifiers.rewardMultiplier * demandMult;

  return {
    player: updatedPlayer,
    riders: updatedRiders,
    orders: finalOrders,
    revenue,
    costs,
    failedDeliveries,
    newOrderCount,
    rewardMultiplier,
  };
}
