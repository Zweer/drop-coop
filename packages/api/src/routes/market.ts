import { CITIES, calculateOrderRate, seededRandom, ZONES } from '@drop-coop/game';
import { and, eq, gt, inArray } from 'drizzle-orm';
import { Hono } from 'hono';

import { db } from '../db/index.ts';
import { events, orders, players, playerZones, riders, zones } from '../models/index.ts';
import type { AppEnv } from '../types.ts';

const marketRoute = new Hono<AppEnv>();

/**
 * Hidden endpoint: insider market intelligence.
 * More accurate than /api/analytics/demand — less noise, timing recommendations.
 */
marketRoute.get('/insider', async (c) => {
  const playerId = c.get('playerId');
  const now = new Date();

  const player = await db.query.players.findFirst({ where: eq(players.id, playerId) });
  /* c8 ignore next */
  if (!player) return c.json({ error: 'Player not found' }, 404);

  const unlockedPZ = await db.query.playerZones.findMany({
    where: eq(playerZones.playerId, playerId),
  });
  const zoneIds = unlockedPZ.map((pz) => pz.zoneId);
  const unlockedZones =
    zoneIds.length > 0 ? await db.query.zones.findMany({ where: inArray(zones.id, zoneIds) }) : [];

  // Active events
  const activeEvents = await db.query.events.findMany({
    where: and(eq(events.playerId, playerId), gt(events.expiresAt, now)),
  });

  // Current order pressure
  const availableOrders = await db.query.orders.findMany({
    where: and(eq(orders.playerId, playerId), eq(orders.status, 'available')),
  });
  const idleRiders = await db.query.riders.findMany({
    where: and(eq(riders.playerId, playerId), eq(riders.status, 'idle')),
  });

  const baseRate = calculateOrderRate(player);
  const totalDemand = unlockedZones.reduce((s, z) => s + z.demandLevel, 0) || 1;

  // Per-zone insider intel with minimal noise (5% vs 30% in analytics)
  const seed = `insider:${playerId}:${Math.floor(now.getTime() / 300000)}`;
  const zoneIntel = unlockedZones.map((zone, i) => {
    const _zoneDef = ZONES.find((z) => z.slug === zone.slug);
    const cityDef = CITIES.find((c) => c.slug === zone.city);
    const share = zone.demandLevel / totalDemand;
    const expectedPerHour = baseRate * share;
    const noise = (seededRandom(`${seed}:${i}`) - 0.5) * 0.1;
    const adjusted = expectedPerHour * (1 + noise);

    // Zone-specific event effects
    const zoneEvents = activeEvents.filter((e) => e.zoneId === zone.id);

    return {
      zone: zone.slug,
      name: zone.name,
      city: cityDef?.name ?? zone.city,
      ordersPerHour: Math.round(adjusted * 100) / 100,
      activeEvents: zoneEvents.map((e) => ({ type: e.type, expiresAt: e.expiresAt })),
      profitPotential: zone.demandLevel >= 7 ? 'high' : zone.demandLevel >= 4 ? 'medium' : 'low',
    };
  });

  // Timing recommendation
  const supplyDemandRatio =
    idleRiders.length > 0 ? availableOrders.length / idleRiders.length : availableOrders.length;
  const recommendation =
    supplyDemandRatio > 2
      ? 'High demand — assign riders now for maximum profit'
      : supplyDemandRatio > 1
        ? 'Moderate demand — good time to operate'
        : 'Low demand — consider resting riders to save energy';

  return c.json({
    timestamp: now.toISOString(),
    recommendation,
    supplyDemandRatio: Math.round(supplyDemandRatio * 100) / 100,
    availableOrders: availableOrders.length,
    idleRiders: idleRiders.length,
    zones: zoneIntel,
  });
});

export default marketRoute;
