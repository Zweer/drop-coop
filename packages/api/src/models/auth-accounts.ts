import { pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { players } from './players.ts';

export const authTypeEnum = pgEnum('auth_type', ['password', 'github', 'google']);

export const authAccounts = pgTable(
  'auth_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id),
    type: authTypeEnum('type').notNull(),
    /** OAuth provider user ID, or null for password. */
    providerId: text('provider_id'),
    /** Password hash, or null for OAuth. */
    credential: text('credential'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.type, t.providerId)],
);
