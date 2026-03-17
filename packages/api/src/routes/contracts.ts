import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { db } from '../db/index.ts';
import { players, playerZones, zones } from '../models/index.ts';
import type { AppEnv } from '../types.ts';

const negotiateSchema = z.object({
  zoneId: z.string().uuid(),
});

const contractsRoute = new Hono<AppEnv>();

/**
 * Hidden endpoint: negotiate contracts with restaurants in a zone.
 * Spend money to earn a profit based on reputation.
 * Higher reputation → better deals.
 */
contractsRoute.post('/negotiate', async (c) => {
  const playerId = c.get('playerId');
  const body = negotiateSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const { zoneId } = body.data;

  const player = await db.query.players.findFirst({ where: eq(players.id, playerId) });
  /* c8 ignore next */
  if (!player) return c.json({ error: 'Player not found' }, 404);

  if (player.reputation < 40)
    return c.json({ error: 'Need at least 40 reputation to negotiate' }, 403);

  const zone = await db.query.zones.findFirst({ where: eq(zones.id, zoneId) });
  if (!zone) return c.json({ error: 'Zone not found' }, 404);

  // Check zone is unlocked
  const unlocked = await db.query.playerZones.findFirst({
    where: and(eq(playerZones.playerId, playerId), eq(playerZones.zoneId, zoneId)),
  });
  if (!unlocked) return c.json({ error: 'Zone not unlocked' }, 403);

  const cost = zone.demandLevel * 100;
  if (player.money < cost) return c.json({ error: 'Not enough money' }, 400);

  // Payout scales with reputation: at rep 50 → 1.5x, at rep 80 → 1.8x, at rep 100 → 2x
  const multiplier = 1 + player.reputation / 100;
  const payout = Math.round(cost * multiplier * 100) / 100;
  const profit = Math.round((payout - cost) * 100) / 100;

  await db
    .update(players)
    .set({
      money: player.money - cost + payout,
      reputation: Math.min(100, player.reputation + 3),
      totalProfit: player.totalProfit + profit,
    })
    .where(eq(players.id, playerId));

  return c.json({
    zone: zone.name,
    cost,
    payout,
    profit,
    reputationGain: 3,
    newReputation: Math.min(100, player.reputation + 3),
  });
});

export default contractsRoute;
