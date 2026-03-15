import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { jwtVerify, SignJWT } from 'jose';
import { z } from 'zod';

import { db } from '../db/index.ts';
import { authAccounts, players } from '../models/index.ts';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret');
const TOKEN_EXPIRY = '24h';

const registerSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(6),
});

const loginSchema = registerSchema;

export async function hashPassword(password: string, salt?: string): Promise<string> {
  const s = salt ?? Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(s), iterations: 100_000, hash: 'SHA-256' },
    key,
    256,
  );
  return `${s}$${Buffer.from(bits).toString('hex')}`;
}

function extractSalt(stored: string): string {
  return stored.split('$')[0];
}

export async function createToken(playerId: string): Promise<string> {
  return new SignJWT({ sub: playerId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(TOKEN_EXPIRY)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return payload.sub ?? '';
}

const auth = new Hono();

auth.post('/register', async (c) => {
  const body = registerSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const { username, password } = body.data;

  const existing = await db.query.players.findFirst({
    where: eq(players.username, username),
  });
  if (existing) return c.json({ error: 'Username taken' }, 409);

  const [player] = await db
    .insert(players)
    .values({ username })
    .returning({ id: players.id, username: players.username });

  const passwordHash = await hashPassword(password);
  await db.insert(authAccounts).values({
    playerId: player.id,
    type: 'password',
    providerId: player.id,
    credential: passwordHash,
  });

  const token = await createToken(player.id);
  return c.json({ token, player }, 201);
});

auth.post('/login', async (c) => {
  const body = loginSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const { username, password } = body.data;

  const player = await db.query.players.findFirst({
    where: eq(players.username, username),
  });
  if (!player) return c.json({ error: 'Invalid credentials' }, 401);

  const account = await db.query.authAccounts.findFirst({
    where: and(eq(authAccounts.playerId, player.id), eq(authAccounts.type, 'password')),
  });
  if (!account?.credential) return c.json({ error: 'Use OAuth to login' }, 400);

  const passwordHash = await hashPassword(password, extractSalt(account.credential));
  if (account.credential !== passwordHash) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const token = await createToken(player.id);
  return c.json({
    token,
    player: { id: player.id, username: player.username },
  });
});

export default auth;
