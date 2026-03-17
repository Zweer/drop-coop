import { Hono } from 'hono';

import type { AppEnv } from '../types.ts';
import analyticsRoute from './analytics.ts';
import batchRoute from './batch.ts';
import coopRoute from './coop.ts';
import eventsRoute from './events.ts';
import ordersRoute from './orders.ts';
import player from './player.ts';
import ridersRoute from './riders.ts';
import zonesRoute from './zones.ts';

/**
 * Stage 4: Obfuscated endpoint aliases.
 * Same handlers as the real routes, mounted under hashed paths.
 * Discovery: find the mapping in the minified frontend JS.
 * Advantage: separate rate limit (2x the normal limit).
 */

export const ENDPOINT_MAP: Record<string, string> = {
  a3f8b2: 'orders',
  '7c9d1e': 'riders',
  b5e4a1: 'zones',
  d2c7f3: 'player',
  e8a1b4: 'coop',
  f4c2d9: 'batch',
  '9b7e3a': 'analytics',
  c1d5f8: 'events',
};

const obfuscated = new Hono<AppEnv>();

obfuscated.route('/a3f8b2', ordersRoute);
obfuscated.route('/7c9d1e', ridersRoute);
obfuscated.route('/b5e4a1', zonesRoute);
obfuscated.route('/d2c7f3', player);
obfuscated.route('/e8a1b4', coopRoute);
obfuscated.route('/f4c2d9', batchRoute);
obfuscated.route('/9b7e3a', analyticsRoute);
obfuscated.route('/c1d5f8', eventsRoute);

export default obfuscated;
