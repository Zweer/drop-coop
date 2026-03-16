import type { EventType } from '@drop-coop/game';
import {
  calculateUpgradeCost,
  generatePool,
  isUpgradeableStat,
  mergeEventEffects,
  POOL_REFRESH_MS,
  poolSeed,
} from '@drop-coop/game';
import { and, eq, gt } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { db } from '../db/index.ts';
import { events, players, riderPool, riders } from '../models/index.ts';
import type { AppEnv } from '../types.ts';

/** Ensure player has a valid pool. Returns current pool entries. */
async function ensurePool(playerId: string) {
  const now = new Date();
  const existing = await db.query.riderPool.findMany({
    where: and(eq(riderPool.playerId, playerId), gt(riderPool.expiresAt, now)),
  });
  if (existing.length > 0) return existing;

  // Generate new pool
  const seed = poolSeed(playerId, now.getTime());
  const generated = generatePool(seed);
  const expiresAt = new Date((Math.floor(now.getTime() / POOL_REFRESH_MS) + 1) * POOL_REFRESH_MS);

  const inserted = await db
    .insert(riderPool)
    .values(generated.map((r) => ({ ...r, playerId, expiresAt })))
    .returning();

  return inserted;
}

const ridersRoute = new Hono<AppEnv>();

ridersRoute.get('/', async (c) => {
  const playerId = c.get('playerId');
  const result = await db.query.riders.findMany({
    where: eq(riders.playerId, playerId),
  });
  return c.json(result);
});

ridersRoute.get('/pool', async (c) => {
  const playerId = c.get('playerId');
  const pool = await ensurePool(playerId);
  const now = Date.now();
  const nextRefresh = (Math.floor(now / POOL_REFRESH_MS) + 1) * POOL_REFRESH_MS;
  return c.json({ riders: pool, refreshesIn: Math.round((nextRefresh - now) / 1000) });
});

ridersRoute.post('/hire', async (c) => {
  const playerId = c.get('playerId');
  const body = z.object({ poolId: z.string().uuid() }).safeParse(await c.req.json());
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const poolEntry = await db.query.riderPool.findFirst({
    where: and(eq(riderPool.id, body.data.poolId), eq(riderPool.playerId, playerId)),
  });
  if (!poolEntry) return c.json({ error: 'Rider not in pool' }, 404);

  const player = await db.query.players.findFirst({
    where: eq(players.id, playerId),
  });
  /* c8 ignore next */
  if (!player) return c.json({ error: 'Player not found' }, 404);
  if (player.money < poolEntry.hireCost) return c.json({ error: 'Not enough money' }, 400);

  await db
    .update(players)
    .set({ money: player.money - poolEntry.hireCost })
    .where(eq(players.id, playerId));

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

  // Remove from pool
  await db.delete(riderPool).where(eq(riderPool.id, poolEntry.id));

  return c.json(rider, 201);
});

const REQUIRED_LEVEL = 5;
const MAX_STAT = 10;

const upgradeSchema = z.object({
  stat: z.string(),
});

ridersRoute.post('/:id/upgrade', async (c) => {
  const playerId = c.get('playerId');
  const riderId = c.req.param('id');
  const body = upgradeSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const { stat } = body.data;
  if (!isUpgradeableStat(stat)) return c.json({ error: 'Invalid stat' }, 400);

  const player = await db.query.players.findFirst({
    where: eq(players.id, playerId),
  });
  /* c8 ignore next */
  if (!player) return c.json({ error: 'Player not found' }, 404);
  if (player.level < REQUIRED_LEVEL)
    return c.json({ error: `Requires level ${REQUIRED_LEVEL}` }, 403);

  const rider = await db.query.riders.findFirst({
    where: and(eq(riders.id, riderId), eq(riders.playerId, playerId)),
  });
  if (!rider) return c.json({ error: 'Rider not found' }, 404);

  const currentValue = rider[stat];
  if (currentValue >= MAX_STAT) return c.json({ error: 'Stat already at max' }, 400);

  const now = new Date();
  const activeEvents = await db.query.events.findMany({
    where: and(eq(events.playerId, playerId), gt(events.expiresAt, now)),
  });
  const mods = mergeEventEffects(activeEvents.map((e) => e.type) as EventType[]);

  const cost = Math.round(calculateUpgradeCost(currentValue) * mods.upgradeCostMultiplier);
  if (player.money < cost) return c.json({ error: 'Not enough money' }, 400);

  await db
    .update(players)
    .set({ money: player.money - cost })
    .where(eq(players.id, playerId));

  await db
    .update(riders)
    .set({ [stat]: currentValue + 1 })
    .where(eq(riders.id, riderId));

  return c.json({ riderId, stat, oldValue: currentValue, newValue: currentValue + 1, cost });
});

ridersRoute.post('/:id/rest', async (c) => {
  const playerId = c.get('playerId');
  const riderId = c.req.param('id');

  const rider = await db.query.riders.findFirst({
    where: and(eq(riders.id, riderId), eq(riders.playerId, playerId)),
  });
  if (!rider) return c.json({ error: 'Rider not found' }, 404);
  if (rider.status === 'delivering') return c.json({ error: 'Rider is delivering' }, 400);

  const newStatus = rider.status === 'resting' ? 'idle' : 'resting';
  await db.update(riders).set({ status: newStatus }).where(eq(riders.id, riderId));

  return c.json({ riderId, status: newStatus });
});

export default ridersRoute;
