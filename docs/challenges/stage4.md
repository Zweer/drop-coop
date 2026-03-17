# Stage 4 — Minified Madness

> "The API is there. You just can't read it."

## The Challenge

The game has a parallel set of API endpoints hidden behind hashed names. They work exactly like the normal endpoints, but with one key advantage: **double the rate limit** (120 req/min vs 60).

Your job: find the mapping between hashes and real endpoints.

## What's New

All normal endpoints have an obfuscated alias under `/api/x/:hash/...`

For example, if `a3f8b2` maps to `orders`, then:
- `GET /api/x/a3f8b2/available` = `GET /api/orders/available`
- `POST /api/x/a3f8b2/assign` = `POST /api/orders/assign`

The mapping covers: orders, riders, zones, player, coop, batch, analytics, events.

## How to Find It

The mapping is embedded in the frontend JavaScript. Look for variables that seem like configuration or telemetry data. The minified bundle contains the hash-to-route mapping — you just need to find it.

Hint: search for `/api/x/` in the JS bundle.

## The Advantage

- **2x rate limit**: 120 requests/minute instead of 60
- Same auth (JWT) and HMAC requirements as normal endpoints
- Batch and analytics aliases still require HMAC signing
- All discovered endpoints count toward the Explorer leaderboard

## What You'll Learn

- Reading minified/bundled JavaScript
- Finding configuration data in source code
- Understanding build artifacts vs source code

## Your Goal

1. Find the endpoint mapping in the frontend JS
2. Update your bot to use the obfuscated paths
3. Enjoy double the request throughput
4. Prepare for Stage 5, where rate limits get serious 🔍
