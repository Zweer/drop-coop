import { serve } from '@hono/node-server';

import app from './app.ts';
import { seedDev } from './db/seed.ts';

const port: number = Number(process.env.PORT) || 3000;

if (process.env.NODE_ENV !== 'production') {
  await seedDev();
}

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🔥 API running on http://localhost:${info.port}`);
});
