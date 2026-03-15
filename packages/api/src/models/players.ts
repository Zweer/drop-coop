import { integer, pgTable, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const players = pgTable('players', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  money: real('money').notNull().default(500),
  reputation: real('reputation').notNull().default(50),
  level: integer('level').notNull().default(1),
  totalDeliveries: integer('total_deliveries').notNull().default(0),
  totalProfit: real('total_profit').notNull().default(0),
  lastTickAt: timestamp('last_tick_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
