import { integer, pgTable, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { players } from './players.ts';

export const zones = pgTable('zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  demandLevel: integer('demand_level').notNull(),
  trafficDensity: integer('traffic_density').notNull(),
  unlockCost: real('unlock_cost').notNull(),
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
