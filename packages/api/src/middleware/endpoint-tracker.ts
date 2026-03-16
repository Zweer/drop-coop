import type { Context, Next } from 'hono';

import { db } from '../db/index.ts';
import { discoveredEndpoints } from '../models/index.ts';

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Normalize path: replace UUIDs with :id so each route pattern counts once. */
function normalizePath(path: string): string {
  return path.replace(UUID_RE, ':id');
}

/** Track unique endpoint discovery per player. Fire-and-forget, never blocks. */
export function endpointTracker(c: Context, next: Next): Promise<void> {
  const playerId = c.get('playerId') as string | undefined;
  /* c8 ignore next -- playerId always set by auth middleware */
  if (playerId) {
    const endpoint = `${c.req.method} ${normalizePath(c.req.path)}`;
    // Fire-and-forget — don't await, don't block the request
    db.insert(discoveredEndpoints)
      .values({ playerId, endpoint })
      .onConflictDoNothing()
      .then(
        () => {},
        () => {},
      );
  }
  return next();
}
