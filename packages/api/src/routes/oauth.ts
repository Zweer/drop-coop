import * as arctic from 'arctic';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';

import { db } from '../db/index.ts';
import { players } from '../models/index.ts';
import { createToken } from './auth.ts';

function getBaseUrl(c: { req: { url: string } }): string {
  const url = new URL(c.req.url);
  return `${url.protocol}//${url.host}`;
}

// --- GitHub ---

function getGitHub(redirectURI: string): arctic.GitHub | null {
  const id = process.env.GITHUB_CLIENT_ID;
  const secret = process.env.GITHUB_CLIENT_SECRET;
  if (!id || !secret) return null;
  return new arctic.GitHub(id, secret, redirectURI);
}

const oauth = new Hono();

oauth.get('/github', (c) => {
  const github = getGitHub(`${getBaseUrl(c)}/api/auth/github/callback`);
  if (!github) return c.json({ error: 'GitHub OAuth not configured' }, 501);

  const state = arctic.generateState();
  const url = github.createAuthorizationURL(state, ['user:email']);

  setCookie(c, 'github_oauth_state', state, {
    path: '/',
    httpOnly: true,
    secure: !c.req.url.includes('localhost'),
    maxAge: 600,
    sameSite: 'Lax',
  });

  return c.redirect(url.toString());
});

oauth.get('/github/callback', async (c) => {
  const github = getGitHub(`${getBaseUrl(c)}/api/auth/github/callback`);
  if (!github) return c.json({ error: 'GitHub OAuth not configured' }, 501);

  const code = c.req.query('code');
  const state = c.req.query('state');
  const storedState = getCookie(c, 'github_oauth_state');

  if (!code || !state || state !== storedState) {
    return c.redirect('/login?error=invalid_state');
  }

  try {
    const tokens = await github.validateAuthorizationCode(code);
    const accessToken = tokens.accessToken();

    const res = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const ghUser = (await res.json()) as { id: number; login: string };

    const githubId = String(ghUser.id);

    // Find or create player
    let player = await db.query.players.findFirst({
      where: eq(players.githubId, githubId),
    });

    if (!player) {
      // Check username collision, append suffix if needed
      let username = ghUser.login;
      const existing = await db.query.players.findFirst({
        where: eq(players.username, username),
      });
      if (existing) username = `${username}_gh`;

      [player] = await db.insert(players).values({ username, githubId }).returning();
    }

    const token = await createToken(player.id);
    return c.redirect(`/login?token=${token}`);
  } catch {
    return c.redirect('/login?error=oauth_failed');
  }
});

// --- Google ---

function getGoogle(redirectURI: string): arctic.Google | null {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) return null;
  return new arctic.Google(id, secret, redirectURI);
}

oauth.get('/google', (c) => {
  const google = getGoogle(`${getBaseUrl(c)}/api/auth/google/callback`);
  if (!google) return c.json({ error: 'Google OAuth not configured' }, 501);

  const state = arctic.generateState();
  const codeVerifier = arctic.generateCodeVerifier();
  const url = google.createAuthorizationURL(state, codeVerifier, ['openid', 'profile']);

  setCookie(c, 'google_oauth_state', state, {
    path: '/',
    httpOnly: true,
    secure: !c.req.url.includes('localhost'),
    maxAge: 600,
    sameSite: 'Lax',
  });
  setCookie(c, 'google_code_verifier', codeVerifier, {
    path: '/',
    httpOnly: true,
    secure: !c.req.url.includes('localhost'),
    maxAge: 600,
    sameSite: 'Lax',
  });

  return c.redirect(url.toString());
});

oauth.get('/google/callback', async (c) => {
  const google = getGoogle(`${getBaseUrl(c)}/api/auth/google/callback`);
  if (!google) return c.json({ error: 'Google OAuth not configured' }, 501);

  const code = c.req.query('code');
  const state = c.req.query('state');
  const storedState = getCookie(c, 'google_oauth_state');
  const codeVerifier = getCookie(c, 'google_code_verifier');

  if (!code || !state || state !== storedState || !codeVerifier) {
    return c.redirect('/login?error=invalid_state');
  }

  try {
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    const idToken = tokens.idToken();
    const claims = arctic.decodeIdToken(idToken) as { sub: string; name?: string };

    const googleId = claims.sub;

    let player = await db.query.players.findFirst({
      where: eq(players.googleId, googleId),
    });

    if (!player) {
      let username =
        claims.name?.replace(/\s+/g, '_').toLowerCase() ?? `player_${googleId.slice(0, 8)}`;
      const existing = await db.query.players.findFirst({
        where: eq(players.username, username),
      });
      if (existing) username = `${username}_g`;

      [player] = await db.insert(players).values({ username, googleId }).returning();
    }

    const token = await createToken(player.id);
    return c.redirect(`/login?token=${token}`);
  } catch {
    return c.redirect('/login?error=oauth_failed');
  }
});

export default oauth;
