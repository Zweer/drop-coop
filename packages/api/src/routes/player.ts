import { getEventDefinition, getProgression } from '@drop-coop/game';
import { Hono } from 'hono';

import { runTick } from '../services/tick.ts';
import type { AppEnv } from '../types.ts';

const player = new Hono<AppEnv>();

player.get('/profile', async (c) => {
  const playerId = c.get('playerId');
  const { player, riders, events, revenue, costs } = await runTick(playerId);

  return c.json({
    ...player,
    riderCount: riders.length,
    progression: getProgression(player),
    lastTick: { revenue, costs },
    events: events.map((e) => {
      const def = getEventDefinition(e.type);
      return { ...e, name: def.name, emoji: def.emoji, description: def.description };
    }),
  });
});

export default player;
