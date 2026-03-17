import { ACHIEVEMENTS, getEventDefinition, getProgression } from '@drop-coop/game';
import { Hono } from 'hono';

import { runTick } from '../services/tick.ts';
import type { AppEnv } from '../types.ts';

const player = new Hono<AppEnv>();

player.get('/profile', async (c) => {
  const playerId = c.get('playerId');
  const { player, riders, events, revenue, costs, newAchievements } = await runTick(playerId);

  return c.json({
    ...player,
    riderCount: riders.length,
    progression: getProgression(player),
    lastTick: { revenue, costs },
    newAchievements: newAchievements.map((id) => {
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      return def ? { id, name: def.name, icon: def.icon } : { id, name: id, icon: '🏅' };
    }),
    events: events.map((e) => {
      const def = getEventDefinition(e.type);
      return { ...e, name: def.name, emoji: def.emoji, description: def.description };
    }),
  });
});

export default player;
