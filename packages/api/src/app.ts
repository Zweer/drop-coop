import { Hono } from 'hono';
import { cors } from 'hono/cors';

export const app: Hono = new Hono();

app.use('*', cors());

app.get('/api/health', (c) => c.json({ status: 'ok' }));

export default app;
