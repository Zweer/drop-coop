import { count, desc, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';

import { db } from '../db/index.ts';
import { discoveredEndpoints, players } from '../models/index.ts';
import type { AppEnv } from '../types.ts';

/** Endpoints that only hackers would call (not used by the frontend). */
const HACKER_ENDPOINT_PATTERNS = ['% /api/batch/%', '% /api/analytics/%'];

const leaderboardRoute = new Hono<AppEnv>();

// 🏆 Tycoon — all players by profit
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

// 🤖 Hacker — profit, but only players who used hacker-only endpoints
leaderboardRoute.get('/hackers', async (c) => {
  const hackerPlayerIds = db
    .selectDistinct({ playerId: discoveredEndpoints.playerId })
    .from(discoveredEndpoints)
    .where(
      sql`(${HACKER_ENDPOINT_PATTERNS.map((p) => sql`${discoveredEndpoints.endpoint} LIKE ${p}`).reduce((a, b) => sql`${a} OR ${b}`)})`,
    );

  const rows = await db
    .select({
      username: players.username,
      totalProfit: players.totalProfit,
      level: players.level,
      totalDeliveries: players.totalDeliveries,
    })
    .from(players)
    .where(sql`${players.id} IN (${hackerPlayerIds})`)
    .orderBy(desc(players.totalProfit))
    .limit(50);

  return c.json(rows.map((r, i) => ({ rank: i + 1, ...r })));
});

// 🔍 Explorer — players ranked by unique endpoints discovered
leaderboardRoute.get('/explorers', async (c) => {
  const rows = await db
    .select({
      username: players.username,
      endpointsDiscovered: count(discoveredEndpoints.id),
    })
    .from(discoveredEndpoints)
    .innerJoin(players, eq(players.id, discoveredEndpoints.playerId))
    .groupBy(players.id, players.username)
    .orderBy(desc(count(discoveredEndpoints.id)))
    .limit(50);

  return c.json(rows.map((r, i) => ({ rank: i + 1, ...r })));
});

export default leaderboardRoute;
