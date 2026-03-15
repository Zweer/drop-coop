import { pgEnum, pgTable, real, timestamp, uuid } from 'drizzle-orm/pg-core';

import { players } from './players.ts';
import { riders } from './riders.ts';
import { zones } from './zones.ts';

export const orderUrgencyEnum = pgEnum('order_urgency', ['normal', 'urgent', 'express']);

export const orderStatusEnum = pgEnum('order_status', [
  'available',
  'assigned',
  'picked_up',
  'delivered',
  'failed',
  'expired',
]);

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id')
    .notNull()
    .references(() => players.id),
  riderId: uuid('rider_id').references(() => riders.id),
  zoneId: uuid('zone_id').references(() => zones.id),
  pickupLat: real('pickup_lat').notNull(),
  pickupLng: real('pickup_lng').notNull(),
  dropoffLat: real('dropoff_lat').notNull(),
  dropoffLng: real('dropoff_lng').notNull(),
  distance: real('distance').notNull(),
  urgency: orderUrgencyEnum('urgency').notNull().default('normal'),
  status: orderStatusEnum('status').notNull().default('available'),
  reward: real('reward').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  assignedAt: timestamp('assigned_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
