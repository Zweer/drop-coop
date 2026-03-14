import type { OrderUrgency } from '@drop-coop/game';
import { calculateDeliveryMinutes, calculateEnergyCost } from '@drop-coop/game';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { db } from '../db/index.ts';
import { orders, riders } from '../models/index.ts';
import { runTick } from '../services/tick.ts';
import type { AppEnv } from '../types.ts';

const URGENCIES: OrderUrgency[] = ['normal', 'normal', 'normal', 'urgent', 'express'];

function generateOrders(playerId: string, count: number) {
  const now = new Date();
  return Array.from({ length: count }, () => {
    const distance = Math.round((Math.random() * 8 + 1) * 10) / 10;
    const urgency = URGENCIES[Math.floor(Math.random() * URGENCIES.length)];
    const multiplier = urgency === 'express' ? 2 : urgency === 'urgent' ? 1.5 : 1;
    const reward = Math.round((3 + distance * 1.5) * multiplier * 100) / 100;
    const expiresAt = new Date(now.getTime() + (15 + Math.random() * 30) * 60 * 1000);

    return {
      playerId,
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

const assignSchema = z.object({
  riderId: z.string().uuid(),
  orderId: z.string().uuid(),
});

const ordersRoute = new Hono<AppEnv>();

ordersRoute.get('/', async (c) => {
  const playerId = c.get('playerId');
  const result = await db.query.orders.findMany({
    where: eq(orders.playerId, playerId),
  });
  return c.json(result);
});

ordersRoute.get('/available', async (c) => {
  const playerId = c.get('playerId');

  // Run tick first to expire/complete old orders
  await runTick(playerId);

  // Check how many available orders exist
  const existing = await db.query.orders.findMany({
    where: and(eq(orders.playerId, playerId), eq(orders.status, 'available')),
  });

  // Generate new orders if fewer than 5 available
  if (existing.length < 5) {
    const newOrders = generateOrders(playerId, 5 - existing.length);
    const inserted = await db.insert(orders).values(newOrders).returning();
    return c.json([...existing, ...inserted]);
  }

  return c.json(existing);
});

ordersRoute.post('/assign', async (c) => {
  const playerId = c.get('playerId');
  const body = assignSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const { riderId, orderId } = body.data;

  const rider = await db.query.riders.findFirst({
    where: and(eq(riders.id, riderId), eq(riders.playerId, playerId)),
  });
  if (!rider) return c.json({ error: 'Rider not found' }, 404);
  if (rider.status !== 'idle') return c.json({ error: 'Rider is busy' }, 400);

  const order = await db.query.orders.findFirst({
    where: and(
      eq(orders.id, orderId),
      eq(orders.playerId, playerId),
      eq(orders.status, 'available'),
    ),
  });
  if (!order) return c.json({ error: 'Order not available' }, 404);

  const energyCost = calculateEnergyCost(rider, order);
  if (rider.energy < energyCost) return c.json({ error: 'Rider too tired' }, 400);

  const now = new Date();
  const deliveryMinutes = calculateDeliveryMinutes(rider, order);

  await db
    .update(orders)
    .set({ riderId, status: 'assigned', assignedAt: now })
    .where(eq(orders.id, orderId));

  await db
    .update(riders)
    .set({ status: 'delivering', energy: rider.energy - energyCost })
    .where(eq(riders.id, riderId));

  return c.json({
    orderId,
    riderId,
    estimatedMinutes: Math.round(deliveryMinutes),
  });
});

export default ordersRoute;
