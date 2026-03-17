import { eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';

import { db } from '../db/index.ts';
import { achievements, playerZones, zones } from '../models/index.ts';
import { runTick } from '../services/tick.ts';
import type { AppEnv } from '../types.ts';

const snapshotRoute = new Hono<AppEnv>();

snapshotRoute.get('/', async (c) => {
  const playerId = c.get('playerId');
  const tick = await runTick(playerId);

  const [unlockedPZ, playerAch] = await Promise.all([
    db.query.playerZones.findMany({ where: eq(playerZones.playerId, playerId) }),
    db
      .select({ achievementId: achievements.achievementId, unlockedAt: achievements.unlockedAt })
      .from(achievements)
      .where(eq(achievements.playerId, playerId)),
  ]);

  const zoneIds = unlockedPZ.map((pz) => pz.zoneId);
  const unlockedZones =
    zoneIds.length > 0 ? await db.query.zones.findMany({ where: inArray(zones.id, zoneIds) }) : [];

  return c.json({
    player: tick.player,
    riders: tick.riders,
    orders: tick.orders,
    events: tick.events,
    zones: unlockedZones,
    achievements: playerAch,
    tick: { revenue: tick.revenue, costs: tick.costs, newAchievements: tick.newAchievements },
  });
});

export default snapshotRoute;
