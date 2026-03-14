import { calculateDeliveryMinutes, calculateRevenue, calculateSalaryCost } from './economy.js';
import type { Order, Player, Rider } from './types.js';

const ENERGY_REGEN_PER_HOUR = 10;

export interface TickResult {
  player: Player;
  riders: Rider[];
  orders: Order[];
  revenue: number;
  costs: number;
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
): TickResult {
  const elapsedMs = now.getTime() - player.lastTickAt.getTime();
  if (elapsedMs <= 0) return { player, riders, orders, revenue: 0, costs: 0 };

  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  let revenue = 0;

  // 1. Complete deliveries whose time has elapsed
  const updatedOrders = orders.map((order) => {
    if (order.status !== 'assigned' || !order.assignedAt) return order;

    const rider = riders.find((r) => r.id === order.riderId);
    if (!rider) return order;

    const deliveryMinutes = calculateDeliveryMinutes(rider, order);
    const doneAt = new Date(order.assignedAt.getTime() + deliveryMinutes * 60 * 1000);

    if (now >= doneAt) {
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

  // 3. Free up riders whose deliveries completed
  const deliveredRiderIds = new Set(
    finalOrders.filter((o) => o.status === 'delivered' && o.deliveredAt).map((o) => o.riderId),
  );

  // 4. Regenerate energy + update rider status
  const updatedRiders = riders.map((rider) => {
    const energyRegen =
      rider.status === 'resting' ? ENERGY_REGEN_PER_HOUR * 2 : ENERGY_REGEN_PER_HOUR;
    const newEnergy = Math.min(100, rider.energy + energyRegen * elapsedHours);
    const newStatus = deliveredRiderIds.has(rider.id) ? ('idle' as const) : rider.status;
    return { ...rider, energy: newEnergy, status: newStatus };
  });

  // 5. Deduct salary costs
  const costs = calculateSalaryCost(riders, elapsedHours);

  // 6. Update player
  const completedCount = finalOrders.filter(
    (o) => o.status === 'delivered' && o.deliveredAt && o.deliveredAt > player.lastTickAt,
  ).length;

  const updatedPlayer: Player = {
    ...player,
    money: player.money + revenue - costs,
    totalDeliveries: player.totalDeliveries + completedCount,
    totalProfit: player.totalProfit + revenue - costs,
    lastTickAt: now,
  };

  return {
    player: updatedPlayer,
    riders: updatedRiders,
    orders: finalOrders,
    revenue,
    costs,
  };
}
