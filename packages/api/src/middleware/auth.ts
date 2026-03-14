import type { Context, Next } from 'hono';

import { verifyToken } from '../routes/auth.ts';

export async function authMiddleware(c: Context, next: Next) {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing token' }, 401);
  }

  try {
    const playerId = await verifyToken(header.slice(7));
    c.set('playerId', playerId);
    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
}
