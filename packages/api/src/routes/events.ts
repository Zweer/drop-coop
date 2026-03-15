import { getEventDefinition } from '@drop-coop/game';
import { and, eq, gt } from 'drizzle-orm';
import { Hono } from 'hono';

import { db } from '../db/index.ts';
import { events } from '../models/index.ts';
import type { AppEnv } from '../types.ts';

const eventsRoute = new Hono<AppEnv>();

eventsRoute.get('/', async (c) => {
  const playerId = c.get('playerId');
  const now = new Date();

  const active = await db.query.events.findMany({
    where: and(eq(events.playerId, playerId), gt(events.expiresAt, now)),
  });

  return c.json(
    active.map((e) => {
      const def = getEventDefinition(e.type);
      return {
        ...e,
        name: def.name,
        emoji: def.emoji,
        description: def.description,
        effects: def.effects,
      };
    }),
  );
});

export default eventsRoute;
