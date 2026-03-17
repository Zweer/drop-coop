import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { authMiddleware } from './middleware/auth.ts';
import { endpointTracker } from './middleware/endpoint-tracker.ts';
import { hmacMiddleware } from './middleware/hmac.ts';
import { rateLimiter } from './middleware/rate-limit.ts';
import analyticsRoute from './routes/analytics.ts';
import auth from './routes/auth.ts';
import batchRoute from './routes/batch.ts';
import contractsRoute from './routes/contracts.ts';
import coopRoute from './routes/coop.ts';
import eventsRoute from './routes/events.ts';
import leaderboardRoute from './routes/leaderboard.ts';
import marketRoute from './routes/market.ts';
import oauth from './routes/oauth.ts';
import optimalRoute from './routes/optimal-route.ts';
import ordersRoute from './routes/orders.ts';
import player from './routes/player.ts';
import ridersRoute from './routes/riders.ts';
import zonesRoute from './routes/zones.ts';

export const app = new Hono();

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://dropcoop.vercel.app',
];

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (ALLOWED_ORIGINS.includes(origin)) return origin;
      // Allow Vercel preview deployments
      if (origin.endsWith('.vercel.app') && origin.includes('dropcoop')) return origin;
      return null;
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Signature'],
    maxAge: 86400,
  }),
);

// Strict rate limit on auth (5 req / 15 min per IP, relaxed in test)
const authRateMax = process.env.USE_PGLITE ? 1000 : 5;
app.use('/api/auth/*', rateLimiter({ max: authRateMax, windowMs: 15 * 60 * 1000 }));

// General rate limit on all API (60 req / min per IP, relaxed in test)
const generalRateMax = process.env.USE_PGLITE ? 1000 : 60;
app.use('/api/*', rateLimiter({ max: generalRateMax, windowMs: 60 * 1000 }));

app.get('/api/health', (c) => c.json({ status: 'ok' }));

app.route('/api/auth', auth);
app.route('/api/auth', oauth);

// Protected routes
app.use('/api/*', authMiddleware);
app.use('/api/*', endpointTracker);
app.route('/api/player', player);
app.route('/api/riders', ridersRoute);
app.route('/api/orders', ordersRoute);
app.route('/api/zones', zonesRoute);
app.route('/api/events', eventsRoute);
app.route('/api/coop', coopRoute);
app.route('/api/leaderboard', leaderboardRoute);

// Stage 2: HMAC-protected bulk endpoints
app.use('/api/batch/*', hmacMiddleware);
app.route('/api/batch', batchRoute);

// Stage 3: HMAC-protected analytics
app.use('/api/analytics/*', hmacMiddleware);
app.route('/api/analytics', analyticsRoute);

// Hidden HMAC-protected endpoints (not documented)
app.use('/api/contracts/*', hmacMiddleware);
app.route('/api/contracts', contractsRoute);
app.use('/api/market/*', hmacMiddleware);
app.route('/api/market', marketRoute);
app.use('/api/riders/optimal-route', hmacMiddleware);
app.route('/api/riders', optimalRoute);

export default app;
