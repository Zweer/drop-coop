import { integer, pgEnum, pgTable, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { players } from './players.ts';

export const riderStatusEnum = pgEnum('rider_status', ['idle', 'delivering', 'resting']);

export const riders = pgTable('riders', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id')
    .notNull()
    .references(() => players.id),
  name: text('name').notNull(),
  speed: integer('speed').notNull(),
  reliability: integer('reliability').notNull(),
  cityKnowledge: integer('city_knowledge').notNull(),
  stamina: integer('stamina').notNull(),
  energy: real('energy').notNull().default(100),
  morale: real('morale').notNull().default(75),
  status: riderStatusEnum('status').notNull().default('idle'),
  salary: real('salary').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
