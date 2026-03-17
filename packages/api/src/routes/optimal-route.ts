import { calculateDeliveryMinutes, calculateEnergyCost } from '@drop-coop/game';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';

import { db } from '../db/index.ts';
import { orders, riders } from '../models/index.ts';
import type { AppEnv } from '../types.ts';

const optimalRoute = new Hono<AppEnv>();

/**
 * Hidden endpoint: server-calculated optimal rider-order assignments.
 * Returns a ranked list of suggested assignments based on efficiency.
 */
optimalRoute.get('/optimal-route', async (c) => {
  const playerId = c.get('playerId');

  const idleRiders = await db.query.riders.findMany({
    where: and(eq(riders.playerId, playerId), eq(riders.status, 'idle')),
  });

  const availableOrders = await db.query.orders.findMany({
    where: and(eq(orders.playerId, playerId), eq(orders.status, 'available')),
  });

  if (idleRiders.length === 0 || availableOrders.length === 0) {
    return c.json({ assignments: [], reason: 'No idle riders or available orders' });
  }

  // Score every (rider, order) pair
  const URGENCY_WEIGHT = { normal: 1, urgent: 2, express: 3 } as const;
  type Urgency = keyof typeof URGENCY_WEIGHT;

  const pairs = idleRiders.flatMap((rider) =>
    availableOrders.map((order) => {
      const minutes = calculateDeliveryMinutes(rider, order);
      const energyCost = calculateEnergyCost(rider, order);
      const canAfford = rider.energy >= energyCost;
      const urgencyW = URGENCY_WEIGHT[order.urgency as Urgency] ?? 1;
      // Score: reward per minute, weighted by urgency, penalized if low energy
      const score = canAfford ? (order.reward / minutes) * urgencyW : 0;

      return {
        riderId: rider.id,
        riderName: rider.name,
        orderId: order.id,
        estimatedMinutes: Math.round(minutes),
        energyCost: Math.round(energyCost),
        reward: order.reward,
        urgency: order.urgency,
        score: Math.round(score * 100) / 100,
        canAfford,
      };
    }),
  );

  // Greedy assignment: pick best pair, remove rider+order, repeat
  const assignments: (typeof pairs)[number][] = [];
  const usedRiders = new Set<string>();
  const usedOrders = new Set<string>();

  const sorted = pairs.filter((p) => p.canAfford).sort((a, b) => b.score - a.score);

  for (const pair of sorted) {
    if (usedRiders.has(pair.riderId) || usedOrders.has(pair.orderId)) continue;
    assignments.push(pair);
    usedRiders.add(pair.riderId);
    usedOrders.add(pair.orderId);
  }

  return c.json({
    assignments,
    unassignedRiders: idleRiders.filter((r) => !usedRiders.has(r.id)).map((r) => r.id),
    unassignedOrders: availableOrders.filter((o) => !usedOrders.has(o.id)).map((o) => o.id),
  });
});

export default optimalRoute;
