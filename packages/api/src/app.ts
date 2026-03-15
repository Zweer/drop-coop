import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { authMiddleware } from './middleware/auth.ts';
import { rateLimiter } from './middleware/rate-limit.ts';
import auth from './routes/auth.ts';
import eventsRoute from './routes/events.ts';
import leaderboardRoute from './routes/leaderboard.ts';
import oauth from './routes/oauth.ts';
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
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  }),
);

// Strict rate limit on auth (5 req / 15 min per IP)
app.use('/api/auth/*', rateLimiter({ max: 5, windowMs: 15 * 60 * 1000 }));

// General rate limit on all API (60 req / min per IP)
app.use('/api/*', rateLimiter({ max: 60, windowMs: 60 * 1000 }));

app.get('/api/health', (c) => c.json({ status: 'ok' }));

app.route('/api/auth', auth);
app.route('/api/auth', oauth);

// Protected routes
app.use('/api/*', authMiddleware);
app.route('/api/player', player);
app.route('/api/riders', ridersRoute);
app.route('/api/orders', ordersRoute);
app.route('/api/zones', zonesRoute);
app.route('/api/events', eventsRoute);
app.route('/api/leaderboard', leaderboardRoute);

export default app;
