import {
  BASE_EVENT_CHANCE_PER_HOUR,
  calculateOrderRate,
  EVENT_CATALOG,
  generatePool,
  POOL_REFRESH_MS,
  poolTimeSlot,
  seededRandom,
  ZONES,
} from '@drop-coop/game';
import { and, eq, gt, sql } from 'drizzle-orm';
import { Hono } from 'hono';

import { db } from '../db/index.ts';
import { events, orders, players, playerZones, riders, zones } from '../models/index.ts';
import type { AppEnv } from '../types.ts';

const analytics = new Hono<AppEnv>();

/** Demand forecast per zone for next N hours. */
analytics.get('/demand', async (c) => {
  const playerId = c.get('playerId');
  const hours = Math.min(12, Math.max(1, Number(c.req.query('hours') ?? 4)));

  const player = await db.query.players.findFirst({ where: eq(players.id, playerId) });
  if (!player) return c.json({ error: 'Player not found' }, 404);

  const unlockedPZ = await db.query.playerZones.findMany({
    where: eq(playerZones.playerId, playerId),
  });
  const zoneIds = unlockedPZ.map((pz) => pz.zoneId);
  const unlockedZones =
    zoneIds.length > 0
      ? await db.query.zones.findMany({ where: sql`${zones.id} = ANY(${zoneIds})` })
      : [];

  const baseRate = calculateOrderRate(player);
  const totalDemand = unlockedZones.reduce((s, z) => s + z.demandLevel, 0) || 1;
  const _noiseSeed = `demand:${playerId}:${Date.now()}`;

  const forecasts = unlockedZones.map((zone) => {
    const zoneDef = ZONES.find((z) => z.slug === zone.slug);
    const share = zone.demandLevel / totalDemand;
    const expected = baseRate * hours * share;
    const noise = 0.3;
    const low = Math.max(0, Math.round(expected * (1 - noise)));
    const high = Math.round(expected * (1 + noise));
    const [minDist, maxDist] = zoneDef?.distanceRange ?? [1, 9];
    const avgDist = (minDist + maxDist) / 2;
    const avgRewardBase = 3 + avgDist * 1.5;
    return {
      zone: zone.slug,
      name: zone.name,
      expectedOrders: [low, high],
      avgReward: [
        Math.round(avgRewardBase * 0.8 * 100) / 100,
        Math.round(avgRewardBase * 1.5 * 100) / 100,
      ],
      demandLevel: zone.demandLevel,
    };
  });

  return c.json({ hours, forecasts });
});

/** Event probability forecast. */
analytics.get('/events', async (c) => {
  const playerId = c.get('playerId');
  const hours = Math.min(12, Math.max(1, Number(c.req.query('hours') ?? 6)));

  const player = await db.query.players.findFirst({ where: eq(players.id, playerId) });
  if (!player) return c.json({ error: 'Player not found' }, 404);

  const now = new Date();
  const activeEvents = await db.query.events.findMany({
    where: and(eq(events.playerId, playerId), gt(events.expiresAt, now)),
  });
  const activeTypes = new Set(activeEvents.map((e) => e.type));

  const baseChance = BASE_EVENT_CHANCE_PER_HOUR * hours * (1 + player.level * 0.02);
  const anyEventProb = Math.min(0.95, baseChance);

  const available = EVENT_CATALOG.filter((e) => !activeTypes.has(e.type));
  const perEvent = available.length > 0 ? anyEventProb / available.length : 0;

  // Add noise: ±20% per event probability
  const noiseSeed = `events:${playerId}:${Math.floor(Date.now() / 60000)}`;
  const predictions = available.map((e, i) => {
    const noise = (seededRandom(`${noiseSeed}:${i}`) - 0.5) * 0.4;
    return {
      type: e.type,
      name: e.name,
      emoji: e.emoji,
      probability: Math.round(Math.max(0.01, Math.min(0.95, perEvent * (1 + noise))) * 100) / 100,
      withinHours: hours,
    };
  });

  return c.json({
    hours,
    anyEventProbability: Math.round(anyEventProb * 100) / 100,
    predictions,
    active: activeEvents.map((e) => {
      const def = EVENT_CATALOG.find((d) => d.type === e.type);
      return { type: e.type, name: def?.name, expiresAt: e.expiresAt };
    }),
  });
});

/** Rider efficiency stats from historical data. */
analytics.get('/riders', async (c) => {
  const playerId = c.get('playerId');

  const playerRiders = await db.query.riders.findMany({
    where: eq(riders.playerId, playerId),
  });

  const completedOrders = await db.query.orders.findMany({
    where: and(eq(orders.playerId, playerId), sql`${orders.status} IN ('delivered', 'failed')`),
  });

  const stats = playerRiders.map((rider) => {
    const riderOrders = completedOrders.filter((o) => o.riderId === rider.id);
    const delivered = riderOrders.filter((o) => o.status === 'delivered').length;
    const failed = riderOrders.filter((o) => o.status === 'failed').length;
    const total = delivered + failed;

    // Best zone by delivery count
    const zoneCounts = new Map<string | null, number>();
    for (const o of riderOrders.filter((o) => o.status === 'delivered')) {
      zoneCounts.set(o.zoneId, (zoneCounts.get(o.zoneId) ?? 0) + 1);
    }
    const bestZoneId = [...zoneCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      riderId: rider.id,
      name: rider.name,
      deliveries: total,
      successRate: total > 0 ? Math.round((delivered / total) * 100) / 100 : null,
      bestZoneId,
    };
  });

  return c.json({ stats });
});

/** Pool preview — peek at next refresh with noise. */
analytics.get('/pool', async (c) => {
  const playerId = c.get('playerId');
  const now = Date.now();
  const nextSlot = poolTimeSlot(now) + 1;
  const nextSeed = `${playerId}:pool:${nextSlot}`;
  const nextPool = generatePool(nextSeed);
  const refreshAt = nextSlot * POOL_REFRESH_MS;

  // Show 3 of 4 riders, with one stat off by ±1
  const noiseSeed = `preview:${playerId}:${nextSlot}`;
  const hideIdx = Math.floor(seededRandom(`${noiseSeed}:hide`) * nextPool.length);

  const hints = nextPool
    .filter((_, i) => i !== hideIdx)
    .map((r, i) => {
      // Randomly offset one stat by ±1
      const statKeys = ['speed', 'reliability', 'cityKnowledge', 'stamina'] as const;
      const fuzzStat = statKeys[Math.floor(seededRandom(`${noiseSeed}:fuzz:${i}`) * 4)];
      const offset = seededRandom(`${noiseSeed}:dir:${i}`) > 0.5 ? 1 : -1;
      const fuzzed = { ...r, [fuzzStat]: Math.max(1, Math.min(10, r[fuzzStat] + offset)) };
      return {
        name: fuzzed.name,
        speed: fuzzed.speed,
        reliability: fuzzed.reliability,
        cityKnowledge: fuzzed.cityKnowledge,
        stamina: fuzzed.stamina,
        estimatedCost: [Math.round(fuzzed.hireCost * 0.9), Math.round(fuzzed.hireCost * 1.1)],
      };
    });

  return c.json({
    hints,
    hiddenCount: 1,
    refreshAt: new Date(refreshAt).toISOString(),
  });
});

export default analytics;
