import { pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { players } from './players.ts';

export const coopPolicies = pgTable(
  'coop_policies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id),
    policyType: text('policy_type').notNull(),
    option: text('option').notNull(),
    activeSince: timestamp('active_since', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.playerId, t.policyType)],
);
