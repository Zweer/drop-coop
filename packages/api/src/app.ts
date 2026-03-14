import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { authMiddleware } from './middleware/auth.ts';
import auth from './routes/auth.ts';
import ordersRoute from './routes/orders.ts';
import player from './routes/player.ts';
import ridersRoute from './routes/riders.ts';

export const app = new Hono();

app.use('*', cors());

app.get('/api/health', (c) => c.json({ status: 'ok' }));

app.route('/api/auth', auth);

// Protected routes
app.use('/api/*', authMiddleware);
app.route('/api/player', player);
app.route('/api/riders', ridersRoute);
app.route('/api/orders', ordersRoute);

export default app;
