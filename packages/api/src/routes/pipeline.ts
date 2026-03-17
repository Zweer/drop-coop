import {
  calculateDeliveryMinutes,
  calculateEnergyCost,
  calculateUpgradeCost,
} from '@drop-coop/game';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { db } from '../db/index.ts';
import { orders, players, riderPool, riders } from '../models/index.ts';
import type { AppEnv } from '../types.ts';

const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('assign'), riderId: z.string().uuid(), orderId: z.string().uuid() }),
  z.object({
    type: z.literal('upgrade'),
    riderId: z.string().uuid(),
    stat: z.enum(['speed', 'reliability', 'cityKnowledge', 'stamina']),
  }),
  z.object({ type: z.literal('rest'), riderId: z.string().uuid() }),
  z.object({ type: z.literal('hire'), poolId: z.string().uuid() }),
]);

const pipelineSchema = z.object({
  actions: z.array(actionSchema).min(1).max(50),
});

const pipelineRoute = new Hono<AppEnv>();

/**
 * Stage 5: Super batch endpoint — multiple action types in one request.
 * Hidden, HMAC-protected. The answer to strict rate limits.
 */
pipelineRoute.post('/', async (c) => {
  const playerId = c.get('playerId');
  const body = pipelineSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const results: { index: number; type: string; ok: boolean; data?: unknown; error?: string }[] =
    [];

  let player = await db.query.players.findFirst({ where: eq(players.id, playerId) });
  /* c8 ignore next */
  if (!player) return c.json({ error: 'Player not found' }, 404);

  for (let i = 0; i < body.data.actions.length; i++) {
    const action = body.data.actions[i];

    try {
      switch (action.type) {
        case 'assign': {
          const rider = await db.query.riders.findFirst({
            where: and(eq(riders.id, action.riderId), eq(riders.playerId, playerId)),
          });
          if (!rider || rider.status !== 'idle') {
            results.push({ index: i, type: 'assign', ok: false, error: 'Rider unavailable' });
            break;
          }
          const order = await db.query.orders.findFirst({
            where: and(
              eq(orders.id, action.orderId),
              eq(orders.playerId, playerId),
              eq(orders.status, 'available'),
            ),
          });
          if (!order) {
            results.push({ index: i, type: 'assign', ok: false, error: 'Order unavailable' });
            break;
          }
          const energyCost = calculateEnergyCost(rider, order);
          if (rider.energy < energyCost) {
            results.push({ index: i, type: 'assign', ok: false, error: 'Rider too tired' });
            break;
          }
          const now = new Date();
          const minutes = calculateDeliveryMinutes(rider, order);
          await db
            .update(orders)
            .set({ riderId: action.riderId, status: 'assigned', assignedAt: now })
            .where(eq(orders.id, action.orderId));
          await db
            .update(riders)
            .set({ status: 'delivering', energy: rider.energy - energyCost })
            .where(eq(riders.id, action.riderId));
          results.push({
            index: i,
            type: 'assign',
            ok: true,
            data: { orderId: action.orderId, estimatedMinutes: Math.round(minutes) },
          });
          break;
        }

        case 'upgrade': {
          if (player.level < 5) {
            results.push({ index: i, type: 'upgrade', ok: false, error: 'Requires level 5' });
            break;
          }
          const rider = await db.query.riders.findFirst({
            where: and(eq(riders.id, action.riderId), eq(riders.playerId, playerId)),
          });
          if (!rider) {
            results.push({ index: i, type: 'upgrade', ok: false, error: 'Rider not found' });
            break;
          }
          const current = Number(rider[action.stat]);
          if (current >= 10) {
            results.push({ index: i, type: 'upgrade', ok: false, error: 'Stat maxed' });
            break;
          }
          const cost = calculateUpgradeCost(current);
          if (player.money < cost) {
            results.push({ index: i, type: 'upgrade', ok: false, error: 'Not enough money' });
            break;
          }
          player = { ...player, money: player.money - cost };
          await db.update(players).set({ money: player.money }).where(eq(players.id, playerId));
          await db
            .update(riders)
            .set({ [action.stat]: current + 1 })
            .where(eq(riders.id, action.riderId));
          results.push({
            index: i,
            type: 'upgrade',
            ok: true,
            data: { stat: action.stat, newValue: current + 1, cost },
          });
          break;
        }

        case 'rest': {
          const rider = await db.query.riders.findFirst({
            where: and(eq(riders.id, action.riderId), eq(riders.playerId, playerId)),
          });
          if (!rider) {
            results.push({ index: i, type: 'rest', ok: false, error: 'Rider not found' });
            break;
          }
          if (rider.status === 'delivering') {
            results.push({ index: i, type: 'rest', ok: false, error: 'Rider is delivering' });
            break;
          }
          const newStatus = rider.status === 'resting' ? 'idle' : 'resting';
          await db.update(riders).set({ status: newStatus }).where(eq(riders.id, action.riderId));
          results.push({ index: i, type: 'rest', ok: true, data: { status: newStatus } });
          break;
        }

        case 'hire': {
          const poolEntry = await db.query.riderPool.findFirst({
            where: and(eq(riderPool.id, action.poolId), eq(riderPool.playerId, playerId)),
          });
          if (!poolEntry) {
            results.push({ index: i, type: 'hire', ok: false, error: 'Not in pool' });
            break;
          }
          if (player.money < poolEntry.hireCost) {
            results.push({ index: i, type: 'hire', ok: false, error: 'Not enough money' });
            break;
          }
          player = { ...player, money: player.money - poolEntry.hireCost };
          await db.update(players).set({ money: player.money }).where(eq(players.id, playerId));
          const [rider] = await db
            .insert(riders)
            .values({
              playerId,
              name: poolEntry.name,
              speed: poolEntry.speed,
              reliability: poolEntry.reliability,
              cityKnowledge: poolEntry.cityKnowledge,
              stamina: poolEntry.stamina,
              salary: poolEntry.salary,
            })
            .returning();
          await db.delete(riderPool).where(eq(riderPool.id, poolEntry.id));
          results.push({ index: i, type: 'hire', ok: true, data: { riderId: rider.id } });
          break;
        }
      }
    } catch {
      results.push({ index: i, type: action.type, ok: false, error: 'Internal error' });
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  return c.json({ results, summary: { total: results.length, succeeded, failed } });
});

export default pipelineRoute;
