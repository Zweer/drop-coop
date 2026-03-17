import type { Context, Next } from 'hono';

const WINDOW = 6;
const MIN_STDDEV_MS = 100;

const timestamps = new Map<string, number[]>();

/* c8 ignore start -- timer-based cleanup */
setInterval(() => {
  const cutoff = Date.now() - 120_000;
  for (const [key, ts] of timestamps) {
    if (ts[ts.length - 1] < cutoff) timestamps.delete(key);
  }
}, 60_000).unref();
/* c8 ignore stop */

/**
 * Stage 5: Detect bot-like timing patterns.
 * If the last N requests have near-identical intervals, reject with 429.
 * Teaches players to add jitter to their request timing.
 */
// biome-ignore lint/suspicious/noConfusingVoidType: Hono middleware signature requires void
export async function timingGuard(c: Context, next: Next): Promise<void | Response> {
  if (process.env.USE_PGLITE || process.env.VITEST) return next();

  const key = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown';
  const now = Date.now();

  const ts = timestamps.get(key) ?? [];
  ts.push(now);
  if (ts.length > WINDOW) ts.shift();
  timestamps.set(key, ts);

  if (ts.length >= WINDOW) {
    const intervals = [];
    for (let i = 1; i < ts.length; i++) {
      intervals.push(ts[i] - ts[i - 1]);
    }
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((s, v) => s + (v - mean) ** 2, 0) / intervals.length;
    const stddev = Math.sqrt(variance);

    if (stddev < MIN_STDDEV_MS) {
      return c.json({ error: 'Too regular. Add some randomness.' }, 429);
    }
  }

  await next();
}
