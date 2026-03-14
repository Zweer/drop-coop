import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { jwtVerify, SignJWT } from 'jose';
import { z } from 'zod';

import { db } from '../db/index.ts';
import { players } from '../models/index.ts';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret');
const TOKEN_EXPIRY = '24h';

const registerSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(6),
});

const loginSchema = registerSchema;

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Buffer.from(hash).toString('hex');
}

async function createToken(playerId: string): Promise<string> {
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
  const passwordHash = await hashPassword(password);

  const existing = await db.query.players.findFirst({
    where: eq(players.username, username),
  });
  if (existing) return c.json({ error: 'Username taken' }, 409);

  const [player] = await db
    .insert(players)
    .values({ username, passwordHash })
    .returning({ id: players.id, username: players.username });

  const token = await createToken(player.id);
  return c.json({ token, player }, 201);
});

auth.post('/login', async (c) => {
  const body = loginSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const { username, password } = body.data;
  const passwordHash = await hashPassword(password);

  const player = await db.query.players.findFirst({
    where: eq(players.username, username),
  });
  if (!player || player.passwordHash !== passwordHash) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const token = await createToken(player.id);
  return c.json({
    token,
    player: { id: player.id, username: player.username },
  });
});

export default auth;
