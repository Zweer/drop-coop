import { pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { players } from './players.ts';

export const achievements = pgTable(
  'achievements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id),
    achievementId: text('achievement_id').notNull(),
    unlockedAt: timestamp('unlocked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.playerId, t.achievementId)],
);
