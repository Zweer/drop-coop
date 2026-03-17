import type { EventType, GameEvent, Order, OrderUrgency, Player, Rider } from '@drop-coop/game';
import {
  CITIES,
  getEventDefinition,
  mergeEventEffects,
  mergePolicyEffects,
  processTick,
  rollNewEvents,
  ZONES,
} from '@drop-coop/game';
import { and, eq, gt, inArray } from 'drizzle-orm';

import { db } from '../db/index.ts';
import {
  coopPolicies,
  events,
  orders,
  players,
  playerZones,
  riders,
  zones,
} from '../models/index.ts';

const URGENCIES: OrderUrgency[] = ['normal', 'normal', 'normal', 'urgent', 'express'];

/* c8 ignore start -- random order generation, logic tested via game engine */
function generateOrders(
  playerId: string,
  count: number,
  unlockedZones: { id: string; slug: string; city: string }[],
  rewardMultiplier: number,
) {
  const now = new Date();
  return Array.from({ length: count }, () => {
    const zone = unlockedZones[Math.floor(Math.random() * unlockedZones.length)];
    const zoneDef = ZONES.find((z) => z.slug === zone.slug);
    const [minDist, maxDist] = zoneDef?.distanceRange ?? [1, 9];

    const cityDef = CITIES.find((c) => c.slug === zone.city);
    const baseLat = cityDef?.baseLat ?? 45.464;
    const baseLng = cityDef?.baseLng ?? 9.19;
    const spread = cityDef?.coordSpread ?? 0.04;

    const distance = Math.round((minDist + Math.random() * (maxDist - minDist)) * 10) / 10;
    const urgency = URGENCIES[Math.floor(Math.random() * URGENCIES.length)];
    const multiplier = urgency === 'express' ? 2 : urgency === 'urgent' ? 1.5 : 1;
    const reward = Math.round((3 + distance * 1.5) * multiplier * rewardMultiplier * 100) / 100;
    const expiresAt = new Date(now.getTime() + (15 + Math.random() * 30) * 60 * 1000);

    return {
      playerId,
      zoneId: zone.id,
      pickupLat: baseLat + Math.random() * spread,
      pickupLng: baseLng + Math.random() * spread,
      dropoffLat: baseLat + Math.random() * spread,
      dropoffLng: baseLng + Math.random() * spread,
      distance,
      urgency,
      reward,
      expiresAt,
    };
  });
}
/* c8 ignore stop */

/** Run lazy tick for a player: compute elapsed game state and persist to DB. */
export async function runTick(playerId: string): Promise<{
  player: Player;
  riders: Rider[];
  orders: Order[];
  events: GameEvent[];
  revenue: number;
  costs: number;
}> {
  const now = new Date();

  const player = await db.query.players.findFirst({
    where: eq(players.id, playerId),
  });
  if (!player) throw new Error('Player not found');

  const elapsedHours = (now.getTime() - player.lastTickAt.getTime()) / (1000 * 60 * 60);

  const playerRiders = await db.query.riders.findMany({
    where: eq(riders.playerId, playerId),
  });

  const activeOrders = await db.query.orders.findMany({
    where: and(eq(orders.playerId, playerId), inArray(orders.status, ['available', 'assigned'])),
  });

  // Load active events
  const activeEvents = await db.query.events.findMany({
    where: and(eq(events.playerId, playerId), gt(events.expiresAt, now)),
  });

  const activeEventTypes = activeEvents.map((e) => e.type) as EventType[];
  const eventMods = mergeEventEffects(activeEventTypes);

  // Load coop policies and merge effects
  const activePolicies = await db.query.coopPolicies.findMany({
    where: eq(coopPolicies.playerId, playerId),
  });
  const policyMods = mergePolicyEffects(
    activePolicies.map((p) => ({ type: p.policyType, option: p.option }) as never),
  );

  // Combine event + policy modifiers
  const modifiers = {
    speedMultiplier: eventMods.speedMultiplier * policyMods.speedMultiplier,
    rewardMultiplier: eventMods.rewardMultiplier * policyMods.rewardMultiplier,
    orderRateMultiplier: eventMods.orderRateMultiplier * policyMods.orderRateMultiplier,
    upgradeCostMultiplier: eventMods.upgradeCostMultiplier * policyMods.upgradeCostMultiplier,
  };

  /* c8 ignore start -- pure data mapping */
  const toGamePlayer = (p: typeof player): Player => ({
    id: p.id,
    money: p.money,
    reputation: p.reputation,
    level: p.level,
    totalDeliveries: p.totalDeliveries,
    totalProfit: p.totalProfit,
    lastTickAt: p.lastTickAt,
  });

  const toGameRider = (r: (typeof playerRiders)[0]): Rider => ({
    id: r.id,
    playerId: r.playerId,
    name: r.name,
    speed: r.speed,
    reliability: r.reliability,
    cityKnowledge: r.cityKnowledge,
    stamina: r.stamina,
    energy: r.energy,
    morale: r.morale,
    status: r.status,
    salary: r.salary,
  });

  const toGameOrder = (o: (typeof activeOrders)[0]): Order => ({
    id: o.id,
    playerId: o.playerId,
    riderId: o.riderId,
    distance: o.distance,
    urgency: o.urgency,
    status: o.status,
    reward: o.reward,
    expiresAt: o.expiresAt,
    assignedAt: o.assignedAt,
    deliveredAt: o.deliveredAt,
  });

  const toGameEvent = (e: (typeof activeEvents)[0]): GameEvent => ({
    id: e.id,
    playerId: e.playerId,
    type: e.type as EventType,
    zoneId: e.zoneId,
    startsAt: e.startsAt,
    expiresAt: e.expiresAt,
  });

  /* c8 ignore stop */

  const result = processTick(
    toGamePlayer(player),
    playerRiders.map(toGameRider),
    activeOrders.map(toGameOrder),
    now,
    modifiers,
  );

  // Persist player
  await db
    .update(players)
    .set({
      money: result.player.money,
      reputation: result.player.reputation,
      level: result.player.level,
      totalDeliveries: result.player.totalDeliveries,
      totalProfit: result.player.totalProfit,
      lastTickAt: now,
    })
    .where(eq(players.id, playerId));

  // Persist changed riders
  for (const rider of result.riders) {
    const original = playerRiders.find((r) => r.id === rider.id);
    if (
      original &&
      (original.energy !== rider.energy ||
        original.status !== rider.status ||
        original.morale !== rider.morale)
    ) {
      await db
        .update(riders)
        .set({ energy: rider.energy, status: rider.status, morale: rider.morale })
        .where(eq(riders.id, rider.id));
    }
  }

  // Persist changed orders
  for (const order of result.orders) {
    const original = activeOrders.find((o) => o.id === order.id);
    if (original && original.status !== order.status) {
      await db
        .update(orders)
        .set({ status: order.status, deliveredAt: order.deliveredAt })
        .where(eq(orders.id, order.id));
    }
  }

  // Load unlocked zones once — used for order generation, zone fees, and events
  const unlockedPZ = await db.query.playerZones.findMany({
    where: eq(playerZones.playerId, playerId),
  });
  const zoneIds = unlockedPZ.map((pz) => pz.zoneId);
  const unlockedZones =
    zoneIds.length > 0 ? await db.query.zones.findMany({ where: inArray(zones.id, zoneIds) }) : [];

  // Generate new orders with reward multiplier from engine
  let newOrders: Order[] = [];
  if (result.newOrderCount > 0 && unlockedZones.length > 0) {
    const orderData = generateOrders(
      playerId,
      result.newOrderCount,
      unlockedZones,
      result.rewardMultiplier,
    );
    const inserted = await db.insert(orders).values(orderData).returning();
    newOrders = inserted.map(toGameOrder);
  }

  // Deduct zone fees
  let zoneFees = 0;
  if (elapsedHours > 0 && unlockedZones.length > 0) {
    zoneFees = unlockedZones.reduce((sum, z) => sum + z.hourlyFee * elapsedHours, 0);
    if (zoneFees > 0) {
      await db
        .update(players)
        .set({ money: result.player.money - zoneFees })
        .where(eq(players.id, playerId));
    }
  }

  // Roll for new events
  const currentEvents = activeEvents.map(toGameEvent);
  if (elapsedHours > 0) {
    const seed = `${playerId}:${now.getTime()}`;
    const newEventTypes = rollNewEvents(elapsedHours, player.level, activeEventTypes, seed);

    /* c8 ignore start -- event generation is random/seeded */
    for (const type of newEventTypes) {
      const def = getEventDefinition(type);
      const [minH, maxH] = def.durationRange;
      const durationMs = (minH + Math.random() * (maxH - minH)) * 60 * 60 * 1000;

      let zoneId: string | null = null;
      if (def.zoneSpecific && unlockedPZ.length > 0) {
        zoneId = unlockedPZ[Math.floor(Math.random() * unlockedPZ.length)].zoneId;
      }

      const [inserted] = await db
        .insert(events)
        .values({
          playerId,
          type,
          zoneId,
          startsAt: now,
          expiresAt: new Date(now.getTime() + durationMs),
        })
        .returning();

      currentEvents.push(toGameEvent(inserted));
    }
    /* c8 ignore stop */
  }

  const finalPlayer =
    zoneFees > 0 ? { ...result.player, money: result.player.money - zoneFees } : result.player;

  return {
    ...result,
    player: finalPlayer,
    orders: [...result.orders, ...newOrders],
    events: currentEvents,
  };
}
