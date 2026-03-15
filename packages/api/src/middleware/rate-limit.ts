import type { Context, Next } from 'hono';

interface Entry {
  count: number;
  resetAt: number;
}

/**
 * Simple in-memory rate limiter.
 * Good enough for burst protection; swap to Redis/DB for multi-instance.
 */
export function rateLimiter(opts: { max: number; windowMs: number }) {
  const store = new Map<string, Entry>();

  // Cleanup stale entries every minute
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 60_000).unref();

  return async (c: Context, next: Next) => {
    const key = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown';
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + opts.windowMs });
      await next();
      return;
    }

    entry.count++;
    if (entry.count > opts.max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      c.header('Retry-After', String(retryAfter));
      return c.json({ error: 'Too many requests' }, 429);
    }

    await next();
  };
}
