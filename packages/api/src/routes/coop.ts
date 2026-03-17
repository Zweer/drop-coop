import type { PolicyOption, PolicyType } from '@drop-coop/game';
import { MIN_RIDERS_FOR_VOTE, POLICIES, simulateVote } from '@drop-coop/game';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { db } from '../db/index.ts';
import { coopPolicies, riders } from '../models/index.ts';
import type { AppEnv } from '../types.ts';

const voteSchema = z.object({
  policyType: z.enum(['pay_structure', 'work_hours', 'equipment_budget']),
});

const coopRoute = new Hono<AppEnv>();

/** Get active policies and available proposals. */
coopRoute.get('/policies', async (c) => {
  const playerId = c.get('playerId');

  const active = await db.query.coopPolicies.findMany({
    where: eq(coopPolicies.playerId, playerId),
  });

  const playerRiders = await db.query.riders.findMany({
    where: eq(riders.playerId, playerId),
  });

  const policies = POLICIES.map((def) => {
    const current = active.find((p) => p.policyType === def.type);
    return {
      type: def.type,
      name: def.name,
      currentOption: current?.option ?? def.defaultOption,
      activeSince: current?.activeSince ?? null,
      options: def.options,
      canVote: playerRiders.length >= MIN_RIDERS_FOR_VOTE,
    };
  });

  return c.json({ policies, riderCount: playerRiders.length, minRiders: MIN_RIDERS_FOR_VOTE });
});

/** Propose a policy change — riders vote instantly. */
coopRoute.post('/vote', async (c) => {
  const playerId = c.get('playerId');
  const body = voteSchema.safeParse(await c.req.json());
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const { policyType } = body.data;

  const playerRiders = await db.query.riders.findMany({
    where: eq(riders.playerId, playerId),
  });

  if (playerRiders.length < MIN_RIDERS_FOR_VOTE)
    return c.json({ error: `Need at least ${MIN_RIDERS_FOR_VOTE} riders to vote` }, 400);

  const def = POLICIES.find((p) => p.type === policyType);
  /* c8 ignore next -- validated by zod */
  if (!def) return c.json({ error: 'Invalid policy type' }, 400);

  const current = await db.query.coopPolicies.findFirst({
    where: and(eq(coopPolicies.playerId, playerId), eq(coopPolicies.policyType, policyType)),
  });
  const currentOption = (current?.option ?? def.defaultOption) as PolicyOption;

  const result = simulateVote(playerRiders, policyType as PolicyType, currentOption);

  // Upsert the policy
  if (current) {
    await db
      .update(coopPolicies)
      .set({ option: result.winner, activeSince: new Date() })
      .where(eq(coopPolicies.id, current.id));
  } else {
    await db.insert(coopPolicies).values({ playerId, policyType, option: result.winner });
  }

  return c.json({
    policyType,
    previousOption: currentOption,
    newOption: result.winner,
    changed: result.winner !== currentOption,
    votes: result.votes,
    riderCount: playerRiders.length,
  });
});

export default coopRoute;
