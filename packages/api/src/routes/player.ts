import { Hono } from 'hono';

import { runTick } from '../services/tick.ts';
import type { AppEnv } from '../types.ts';

const player = new Hono<AppEnv>();

player.get('/profile', async (c) => {
  const playerId = c.get('playerId');
  const { player, riders, revenue, costs } = await runTick(playerId);

  return c.json({
    ...player,
    riderCount: riders.length,
    lastTick: { revenue, costs },
  });
});

export default player;
