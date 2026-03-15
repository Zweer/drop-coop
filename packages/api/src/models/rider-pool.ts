import { integer, pgTable, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { players } from './players.ts';

export const riderPool = pgTable('rider_pool', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id')
    .notNull()
    .references(() => players.id),
  name: text('name').notNull(),
  speed: integer('speed').notNull(),
  reliability: integer('reliability').notNull(),
  cityKnowledge: integer('city_knowledge').notNull(),
  stamina: integer('stamina').notNull(),
  hireCost: real('hire_cost').notNull(),
  salary: real('salary').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
