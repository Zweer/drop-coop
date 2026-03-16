import {
  calculateDeliveryMinutes,
  calculateEnergyCost,
  calculateUpgradeCost,
} from '@drop-coop/game';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { db } from '../db/index.ts';
import { orders, players, riders } from '../models/index.ts';
import type { AppEnv } from '../types.ts';

const batchAssignSchema = z.object({
  assignments: z
    .array(z.object({ riderId: z.string().uuid(), orderId: z.string().uuid() }))
    .min(1)
    .max(20),
});

const bulkUpgradeSchema = z.object({
  upgrades: z
    .array(
      z.object({
        riderId: z.string().uuid(),
        stat: z.enum(['speed', 'reliability', 'cityKnowledge', 'stamina']),
      }),
    )
    .min(1)
    .max(20),
});

const batchRoute = new Hono<AppEnv>();

batchRoute.post('/assign', async (c) => {
  const playerId = c.get('playerId');
  const body = batchAssignSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const results: { orderId: string; riderId: string; estimatedMinutes: number }[] = [];
  const errors: { orderId: string; error: string }[] = [];

  for (const { riderId, orderId } of body.data.assignments) {
    const rider = await db.query.riders.findFirst({
      where: and(eq(riders.id, riderId), eq(riders.playerId, playerId)),
    });
    if (!rider || rider.status !== 'idle') {
      errors.push({ orderId, error: rider ? 'Rider is busy' : 'Rider not found' });
      continue;
    }

    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, orderId),
        eq(orders.playerId, playerId),
        eq(orders.status, 'available'),
      ),
    });
    if (!order) {
      errors.push({ orderId, error: 'Order not available' });
      continue;
    }

    const energyCost = calculateEnergyCost(rider, order);
    if (rider.energy < energyCost) {
      errors.push({ orderId, error: 'Rider too tired' });
      continue;
    }

    const now = new Date();
    const minutes = calculateDeliveryMinutes(rider, order);

    await db
      .update(orders)
      .set({ riderId, status: 'assigned', assignedAt: now })
      .where(eq(orders.id, orderId));
    await db
      .update(riders)
      .set({ status: 'delivering', energy: rider.energy - energyCost })
      .where(eq(riders.id, riderId));

    results.push({ orderId, riderId, estimatedMinutes: Math.round(minutes) });
  }

  return c.json({ results, errors });
});

batchRoute.post('/upgrade', async (c) => {
  const playerId = c.get('playerId');
  const body = bulkUpgradeSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const player = await db.query.players.findFirst({ where: eq(players.id, playerId) });
  /* c8 ignore next */
  if (!player) return c.json({ error: 'Player not found' }, 404);
  if (player.level < 5) return c.json({ error: 'Upgrades unlock at level 5' }, 403);

  let money = player.money;
  const results: { riderId: string; stat: string; newValue: number; cost: number }[] = [];
  const errors: { riderId: string; error: string }[] = [];

  // Validate all upgrades first, then apply atomically
  const pending: { riderId: string; stat: string; newValue: number; cost: number }[] = [];

  for (const { riderId, stat } of body.data.upgrades) {
    const rider = await db.query.riders.findFirst({
      where: and(eq(riders.id, riderId), eq(riders.playerId, playerId)),
    });
    if (!rider) {
      errors.push({ riderId, error: 'Rider not found' });
      continue;
    }

    const current = Number(rider[stat]);
    if (current >= 10) {
      errors.push({ riderId, error: `${stat} already maxed` });
      continue;
    }

    const cost = calculateUpgradeCost(current);
    if (money < cost) {
      errors.push({ riderId, error: 'Not enough money' });
      continue;
    }

    money -= cost;
    pending.push({ riderId, stat, newValue: current + 1, cost });
  }

  if (pending.length > 0) {
    await db.transaction(async (tx) => {
      for (const { riderId, stat, newValue } of pending) {
        await tx
          .update(riders)
          .set({ [stat]: newValue })
          .where(eq(riders.id, riderId));
      }
      await tx.update(players).set({ money }).where(eq(players.id, playerId));
    });
    results.push(...pending);
  }

  return c.json({ results, errors, remainingMoney: money });
});

export default batchRoute;
