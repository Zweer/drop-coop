import { integer, pgTable, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { players } from './players.ts';

export const zones = pgTable('zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  demandLevel: integer('demand_level').notNull(),
  trafficDensity: integer('traffic_density').notNull(),
  unlockCost: real('unlock_cost').notNull(),
  requiredLevel: integer('required_level').notNull().default(1),
  hourlyFee: real('hourly_fee').notNull().default(0),
});

export const playerZones = pgTable('player_zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id')
    .notNull()
    .references(() => players.id),
  zoneId: uuid('zone_id')
    .notNull()
    .references(() => zones.id),
  unlockedAt: timestamp('unlocked_at', { withTimezone: true }).notNull().defaultNow(),
});
