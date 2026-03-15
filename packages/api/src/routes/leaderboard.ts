import { desc } from 'drizzle-orm';
import { Hono } from 'hono';

import { db } from '../db/index.ts';
import { players } from '../models/index.ts';
import type { AppEnv } from '../types.ts';

const leaderboardRoute = new Hono<AppEnv>();

leaderboardRoute.get('/', async (c) => {
  const rows = await db
    .select({
      username: players.username,
      totalProfit: players.totalProfit,
      level: players.level,
      totalDeliveries: players.totalDeliveries,
    })
    .from(players)
    .orderBy(desc(players.totalProfit))
    .limit(50);

  return c.json(rows.map((r, i) => ({ rank: i + 1, ...r })));
});

export default leaderboardRoute;
