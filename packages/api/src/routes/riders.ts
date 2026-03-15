import { calculateUpgradeCost, isUpgradeableStat } from '@drop-coop/game';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { db } from '../db/index.ts';
import { players, riders } from '../models/index.ts';
import type { AppEnv } from '../types.ts';

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

function randomStat(): number {
  return Math.floor(Math.random() * 5) + 3; // 3-7
}

function generateRiderPool() {
  return Array.from({ length: 3 }, () => {
    const speed = randomStat();
    const reliability = randomStat();
    const cityKnowledge = randomStat();
    const stamina = randomStat();
    const avgStat = (speed + reliability + cityKnowledge + stamina) / 4;
    return {
      name: NAMES[Math.floor(Math.random() * NAMES.length)],
      speed,
      reliability,
      cityKnowledge,
      stamina,
      hireCost: Math.round(HIRE_COST_BASE * (avgStat / 5)),
      salary: Math.round(avgStat * 2 * 10) / 10,
    };
  });
}

const hireSchema = z.object({
  name: z.string(),
  speed: z.number().int().min(1).max(10),
  reliability: z.number().int().min(1).max(10),
  cityKnowledge: z.number().int().min(1).max(10),
  stamina: z.number().int().min(1).max(10),
});

const ridersRoute = new Hono<AppEnv>();

ridersRoute.get('/', async (c) => {
  const playerId = c.get('playerId');
  const result = await db.query.riders.findMany({
    where: eq(riders.playerId, playerId),
  });
  return c.json(result);
});

ridersRoute.get('/pool', (c) => {
  return c.json(generateRiderPool());
});

ridersRoute.post('/hire', async (c) => {
  const playerId = c.get('playerId');
  const body = hireSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const { name, speed, reliability, cityKnowledge, stamina } = body.data;
  const avgStat = (speed + reliability + cityKnowledge + stamina) / 4;
  const hireCost = Math.round(HIRE_COST_BASE * (avgStat / 5));
  const salary = Math.round(avgStat * 2 * 10) / 10;

  const player = await db.query.players.findFirst({
    where: eq(players.id, playerId),
  });
  if (!player) return c.json({ error: 'Player not found' }, 404);
  if (player.money < hireCost) return c.json({ error: 'Not enough money' }, 400);

  await db
    .update(players)
    .set({ money: player.money - hireCost })
    .where(eq(players.id, playerId));

  const [rider] = await db
    .insert(riders)
    .values({ playerId, name, speed, reliability, cityKnowledge, stamina, salary })
    .returning();

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
  if (!player) return c.json({ error: 'Player not found' }, 404);
  if (player.level < REQUIRED_LEVEL)
    return c.json({ error: `Requires level ${REQUIRED_LEVEL}` }, 403);

  const rider = await db.query.riders.findFirst({
    where: and(eq(riders.id, riderId), eq(riders.playerId, playerId)),
  });
  if (!rider) return c.json({ error: 'Rider not found' }, 404);

  const currentValue = rider[stat];
  if (currentValue >= MAX_STAT) return c.json({ error: 'Stat already at max' }, 400);

  const cost = calculateUpgradeCost(currentValue);
  if (player.money < cost) return c.json({ error: 'Not enough money' }, 400);

  await db
    .update(players)
    .set({ money: player.money - cost })
    .where(eq(players.id, playerId));

  await db
    .update(riders)
    .set({ [stat]: currentValue + 1 })
    .where(eq(riders.id, riderId));

  return c.json({
    riderId,
    stat,
    oldValue: currentValue,
    newValue: currentValue + 1,
    cost,
  });
});

export default ridersRoute;
