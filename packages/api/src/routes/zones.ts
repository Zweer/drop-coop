import { ZONES } from '@drop-coop/game';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { db } from '../db/index.ts';
import { players, playerZones, zones } from '../models/index.ts';
import type { AppEnv } from '../types.ts';

/** Ensure all zone definitions exist in DB. Returns DB zones. */
async function ensureZones() {
  const existing = await db.query.zones.findMany();
  if (existing.length >= ZONES.length) return existing;

  const existingSlugs = new Set(existing.map((z) => z.slug));
  const missing = ZONES.filter((z) => !existingSlugs.has(z.slug));

  if (missing.length > 0) {
    await db.insert(zones).values(
      missing.map((z) => ({
        slug: z.slug,
        name: z.name,
        demandLevel: z.demandLevel,
        trafficDensity: z.trafficDensity,
        unlockCost: z.unlockCost,
        requiredLevel: z.requiredLevel,
        hourlyFee: z.hourlyFee,
      })),
    );
  }

  return db.query.zones.findMany();
}

/** Ensure player has Centro unlocked (free starter zone). */
async function ensureStarterZone(playerId: string, allZones: { id: string; slug: string }[]) {
  const centro = allZones.find((z) => z.slug === 'centro');
  if (!centro) return;

  const existing = await db.query.playerZones.findFirst({
    where: and(eq(playerZones.playerId, playerId), eq(playerZones.zoneId, centro.id)),
  });

  if (!existing) {
    await db.insert(playerZones).values({ playerId, zoneId: centro.id });
  }
}

const unlockSchema = z.object({
  zoneId: z.string().uuid(),
});

const zonesRoute = new Hono<AppEnv>();

zonesRoute.get('/', async (c) => {
  const playerId = c.get('playerId');
  const allZones = await ensureZones();
  await ensureStarterZone(playerId, allZones);

  const unlocked = await db.query.playerZones.findMany({
    where: eq(playerZones.playerId, playerId),
  });
  const unlockedIds = new Set(unlocked.map((pz) => pz.zoneId));

  return c.json(
    allZones.map((z) => ({
      ...z,
      unlocked: unlockedIds.has(z.id),
    })),
  );
});

zonesRoute.post('/unlock', async (c) => {
  const playerId = c.get('playerId');
  const body = unlockSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const { zoneId } = body.data;

  const zone = await db.query.zones.findFirst({ where: eq(zones.id, zoneId) });
  if (!zone) return c.json({ error: 'Zone not found' }, 404);

  const player = await db.query.players.findFirst({ where: eq(players.id, playerId) });
  if (!player) return c.json({ error: 'Player not found' }, 404);

  if (player.level < zone.requiredLevel)
    return c.json({ error: `Requires level ${zone.requiredLevel}` }, 403);

  const already = await db.query.playerZones.findFirst({
    where: and(eq(playerZones.playerId, playerId), eq(playerZones.zoneId, zoneId)),
  });
  if (already) return c.json({ error: 'Already unlocked' }, 409);

  if (player.money < zone.unlockCost) return c.json({ error: 'Not enough money' }, 400);

  await db
    .update(players)
    .set({ money: player.money - zone.unlockCost })
    .where(eq(players.id, playerId));

  await db.insert(playerZones).values({ playerId, zoneId });

  return c.json({ zoneId, name: zone.name, cost: zone.unlockCost }, 201);
});

export default zonesRoute;
