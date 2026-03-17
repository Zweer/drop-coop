import { eq } from 'drizzle-orm';
import { Hono } from 'hono';

import { db } from '../db/index.ts';
import { orders, playerZones, riders } from '../models/index.ts';
import type { AppEnv } from '../types.ts';

const treasuryRoute = new Hono<AppEnv>();

treasuryRoute.get('/breakdown', async (c) => {
  const playerId = c.get('playerId');

  const [playerRiders, allOrders, unlockedPZ] = await Promise.all([
    db.query.riders.findMany({ where: eq(riders.playerId, playerId) }),
    db.query.orders.findMany({ where: eq(orders.playerId, playerId) }),
    db.query.playerZones.findMany({ where: eq(playerZones.playerId, playerId) }),
  ]);

  const zoneIds = unlockedPZ.map((pz) => pz.zoneId);
  const unlockedZones = zoneIds.length > 0 ? await db.query.zones.findMany() : [];
  const zoneMap = new Map(unlockedZones.map((z) => [z.id, z]));

  const delivered = allOrders.filter((o) => o.status === 'delivered');

  // Revenue by zone
  const revenueByZone: Record<string, { zone: string; revenue: number; count: number }> = {};
  for (const o of delivered) {
    const zid = o.zoneId ?? 'unknown';
    if (!revenueByZone[zid]) {
      revenueByZone[zid] = { zone: zoneMap.get(zid)?.slug ?? zid, revenue: 0, count: 0 };
    }
    const entry = revenueByZone[zid];
    entry.revenue += o.reward;
    entry.count++;
  }

  // Revenue per rider
  const revenueByRider: Record<string, { name: string; revenue: number; deliveries: number }> = {};
  for (const o of delivered) {
    if (!o.riderId) continue;
    const rider = playerRiders.find((r) => r.id === o.riderId);
    if (!revenueByRider[o.riderId]) {
      revenueByRider[o.riderId] = { name: rider?.name ?? o.riderId, revenue: 0, deliveries: 0 };
    }
    const entry = revenueByRider[o.riderId];
    entry.revenue += o.reward;
    entry.deliveries++;
  }

  const totalRevenue = delivered.reduce((s, o) => s + o.reward, 0);
  const totalSalaries = playerRiders.reduce((s, r) => s + r.salary, 0);
  const totalZoneFees = unlockedZones
    .filter((z) => zoneIds.includes(z.id))
    .reduce((s, z) => s + z.hourlyFee, 0);

  return c.json({
    totalRevenue,
    totalDeliveries: delivered.length,
    totalFailed: allOrders.filter((o) => o.status === 'failed').length,
    totalExpired: allOrders.filter((o) => o.status === 'expired').length,
    hourlyCosts: { salaries: totalSalaries, zoneFees: totalZoneFees },
    revenueByZone: Object.values(revenueByZone),
    revenueByRider: Object.values(revenueByRider),
  });
});

export default treasuryRoute;
