import type { Order, OrderUrgency, Player, Rider } from '@drop-coop/game';
import { processTick, ZONES } from '@drop-coop/game';
import { and, eq, inArray } from 'drizzle-orm';

import { db } from '../db/index.ts';
import { orders, players, playerZones, riders, zones } from '../models/index.ts';

const URGENCIES: OrderUrgency[] = ['normal', 'normal', 'normal', 'urgent', 'express'];

function generateOrders(
  playerId: string,
  count: number,
  unlockedZones: { id: string; slug: string }[],
) {
  const now = new Date();
  return Array.from({ length: count }, () => {
    // Pick a random unlocked zone
    const zone = unlockedZones[Math.floor(Math.random() * unlockedZones.length)];
    const zoneDef = ZONES.find((z) => z.slug === zone.slug);
    const [minDist, maxDist] = zoneDef?.distanceRange ?? [1, 9];

    const distance = Math.round((minDist + Math.random() * (maxDist - minDist)) * 10) / 10;
    const urgency = URGENCIES[Math.floor(Math.random() * URGENCIES.length)];
    const multiplier = urgency === 'express' ? 2 : urgency === 'urgent' ? 1.5 : 1;
    const reward = Math.round((3 + distance * 1.5) * multiplier * 100) / 100;
    const expiresAt = new Date(now.getTime() + (15 + Math.random() * 30) * 60 * 1000);

    return {
      playerId,
      zoneId: zone.id,
      pickupLat: 45.46 + Math.random() * 0.04,
      pickupLng: 9.17 + Math.random() * 0.04,
      dropoffLat: 45.46 + Math.random() * 0.04,
      dropoffLng: 9.17 + Math.random() * 0.04,
      distance,
      urgency,
      reward,
      expiresAt,
    };
  });
}

/** Run lazy tick for a player: compute elapsed game state and persist to DB. */
export async function runTick(playerId: string): Promise<{
  player: Player;
  riders: Rider[];
  orders: Order[];
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

  const result = processTick(
    toGamePlayer(player),
    playerRiders.map(toGameRider),
    activeOrders.map(toGameOrder),
    now,
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
    if (original && (original.energy !== rider.energy || original.status !== rider.status)) {
      await db
        .update(riders)
        .set({ energy: rider.energy, status: rider.status })
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

  // Generate new orders from tick
  let newOrders: Order[] = [];
  if (result.newOrderCount > 0) {
    // Get player's unlocked zones
    const unlockedPZ = await db.query.playerZones.findMany({
      where: eq(playerZones.playerId, playerId),
    });
    if (unlockedPZ.length > 0) {
      const zoneIds = unlockedPZ.map((pz) => pz.zoneId);
      const unlockedZones = await db.query.zones.findMany({
        where: inArray(zones.id, zoneIds),
      });
      if (unlockedZones.length > 0) {
        const orderData = generateOrders(playerId, result.newOrderCount, unlockedZones);
        const inserted = await db.insert(orders).values(orderData).returning();
        newOrders = inserted.map(toGameOrder);
      }
    }
  }

  // Deduct zone fees
  let zoneFees = 0;
  if (elapsedHours > 0) {
    const unlockedPZ = await db.query.playerZones.findMany({
      where: eq(playerZones.playerId, playerId),
    });
    if (unlockedPZ.length > 0) {
      const zoneIds = unlockedPZ.map((pz) => pz.zoneId);
      const unlockedZones = await db.query.zones.findMany({
        where: inArray(zones.id, zoneIds),
      });
      zoneFees = unlockedZones.reduce((sum, z) => sum + z.hourlyFee * elapsedHours, 0);
      if (zoneFees > 0) {
        await db
          .update(players)
          .set({ money: result.player.money - zoneFees })
          .where(eq(players.id, playerId));
      }
    }
  }

  const finalPlayer =
    zoneFees > 0 ? { ...result.player, money: result.player.money - zoneFees } : result.player;

  return {
    ...result,
    player: finalPlayer,
    orders: [...result.orders, ...newOrders],
  };
}
