---
title: About drop-coop
---

# About drop-coop

**drop-coop** is two games in one:

1. **A tycoon game** — Manage a delivery rider cooperative in Milan. Hire riders, accept orders, deliver food, grow your business.
2. **A hacking sandbox** — The game runs on real API endpoints. Discover them, reverse-engineer the security layers, and write bots to automate your operations.

Your bot works while you sleep. When you wake up, you're ahead of everyone who played by hand.

## Why?

The creator used to bot a browser game called Big Bang Empire — reverse-engineering the API, sniffing requests, automating gameplay. That game is dead now. Instead of finding another game to hack, we built one where **hacking is a feature, not an exploit**.

## How it works

### For casual players

Click, manage, grow. A normal tycoon game with riders, orders, zones, events, and cooperative mechanics.

### For hackers

Everything the frontend does goes through real API endpoints:

```bash
curl http://localhost:5173/api/orders/available
```

As you progress, the game adds security layers — JWT, HMAC signing, obfuscation, rate limiting — each one a new reverse engineering challenge.

## Game mechanics

- **Riders** — Hire, upgrade stats (speed, reliability, knowledge, stamina), manage energy and morale
- **Orders** — Dynamic arrival based on time, zone demand, and reputation
- **Economy** — Revenue, costs, dynamic pricing, weather bonuses
- **Zones & Cities** — Expand from Milan to Bologna, Firenze, and Torino (14 zones total)
- **Events** — Storms, festivals, strikes, competitor entry
- **Cooperative** — Riders vote on policies (pay structure, work hours, equipment budget)
- **Achievements** — 22 badges tracking your progress

## Tech stack

| Component | Technology |
|-----------|-----------|
| Backend | Hono (TypeScript) |
| Runtime | Node.js 22 |
| Database | PostgreSQL (Neon) |
| ORM | Drizzle |
| Frontend | Svelte 5 + SvelteKit |
| UI | shadcn-svelte |
| Test | Vitest + Playwright |
| Deploy | Vercel |

## Open source

drop-coop is MIT licensed. The entire source code is on [GitHub](https://github.com/Zweer/drop-coop).
