import app from '@drop-coop/api/app';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.pathname.startsWith('/api/')) {
    return app.fetch(event.request);
  }
  return resolve(event);
};
