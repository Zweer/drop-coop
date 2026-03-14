import { eq } from 'drizzle-orm';

import { players } from '../models/index.ts';
import { db } from './index.ts';

const DEV_USERNAME = 'dev';
const DEV_PASSWORD = 'dev123';

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Buffer.from(hash).toString('hex');
}

export async function seedDev(): Promise<void> {
  const existing = await db.query.players.findFirst({
    where: eq(players.username, DEV_USERNAME),
  });
  if (existing) return;

  const passwordHash = await hashPassword(DEV_PASSWORD);
  await db.insert(players).values({ username: DEV_USERNAME, passwordHash });
  console.log(`🌱 Dev user created: ${DEV_USERNAME} / ${DEV_PASSWORD}`);
}
