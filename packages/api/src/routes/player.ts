import { getProgression } from '@drop-coop/game';
import { Hono } from 'hono';

import { runTick } from '../services/tick.ts';
import type { AppEnv } from '../types.ts';

const player = new Hono<AppEnv>();

player.get('/profile', async (c) => {
  const playerId = c.get('playerId');
  const { player, riders, revenue, costs, failedDeliveries } = await runTick(playerId);

  return c.json({
    ...player,
    riderCount: riders.length,
    progression: getProgression(player),
    lastTick: { revenue, costs, failedDeliveries },
  });
});

export default player;
