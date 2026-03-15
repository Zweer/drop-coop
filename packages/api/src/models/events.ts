import { pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { players } from './players.ts';
import { zones } from './zones.ts';

export const eventTypeEnum = pgEnum('event_type', [
  'rainstorm',
  'food_festival',
  'bike_lane_closure',
  'viral_review',
  'equipment_sale',
]);

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id')
    .notNull()
    .references(() => players.id),
  type: eventTypeEnum('type').notNull(),
  zoneId: uuid('zone_id').references(() => zones.id),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
