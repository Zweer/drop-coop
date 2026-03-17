import { ACHIEVEMENTS } from '@drop-coop/game';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';

import { db } from '../db/index.ts';
import { achievements } from '../models/index.ts';
import type { AppEnv } from '../types.ts';

const achievementsRoute = new Hono<AppEnv>();

achievementsRoute.get('/', async (c) => {
  const playerId = c.get('playerId');
  const unlocked = await db
    .select({ achievementId: achievements.achievementId, unlockedAt: achievements.unlockedAt })
    .from(achievements)
    .where(eq(achievements.playerId, playerId));

  const unlockedMap = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]));

  return c.json(
    ACHIEVEMENTS.map((a) => ({
      ...a,
      unlocked: unlockedMap.has(a.id),
      unlockedAt: unlockedMap.get(a.id) ?? null,
    })),
  );
});

export default achievementsRoute;
