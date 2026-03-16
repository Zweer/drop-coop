import { pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { players } from './players.ts';

export const discoveredEndpoints = pgTable(
  'discovered_endpoints',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id),
    endpoint: text('endpoint').notNull(),
    discoveredAt: timestamp('discovered_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.playerId, t.endpoint)],
);
