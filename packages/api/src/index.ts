import { serve } from '@hono/node-server';

import app from './app.ts';

const port: number = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🔥 API running on http://localhost:${info.port}`);
});
