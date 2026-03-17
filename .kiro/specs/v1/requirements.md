# drop-coop — Core Requirements

> "Your delivery co-op, your rules. 🚲"
>
> A browser-based delivery tycoon with a hidden API hacking layer.

## Project Info

| Item | Value |
|------|-------|
| **Name** | drop-coop |
| **Tagline** | "Your delivery co-op, your rules." |
| **GitHub** | `Zweer/drop-coop` |
| **Genre** | Tycoon / Idle / Hacking sandbox |
| **Platform** | Browser (hosted on Vercel) |
| **License** | MIT |

## Overview

**drop-coop** is a browser-based tycoon game where you manage a delivery rider cooperative. On the surface, it's a management sim. Underneath, it's a hacking sandbox — the game runs on real API endpoints that players can discover, reverse-engineer, and automate with bots.

The game is designed with two audiences in mind:
1. **Casual players** — click, manage, grow your co-op
2. **Hackers/devs** — sniff the APIs, write bots, compete on the hacker leaderboard

## Origin Story

The creator previously built a bot for the browser game "Big Bang Empire" — reverse-engineering the game's API, sniffing requests, and automating gameplay. The thrill was having a bot play 24/7 while other players had to click manually.

That game is now dead. Rather than finding another game to bot, the idea is to build a game that **embraces** automation as a feature, not an exploit. The reverse engineering is the game.

### Why Not Just a Hacking Challenge?

We considered several approaches:

1. **Juice Shop-style staged challenges** — Each level adds a security layer (JWT, HMAC, obfuscation). Problem: AI agents in 2026 can deobfuscate JS and find HMAC keys in seconds. Pure reverse engineering is no longer a meaningful challenge.

2. **Competitive bot arena** (CodinGame/Battlecode style) — Write the best algorithm. Problem: massive scope (matchmaking, real-time infra, balancing), requires active community to be fun.

3. **The hybrid** — A real tycoon game where the API is open, and the challenge is both discovering the API AND writing an efficient bot. The game is fun to play manually, but automation gives you a massive edge. This is what we're building.

### Why This Works

- The **motivation to automate is real** — your co-op needs it to scale
- **Reverse engineering is the entry point** — discover the API
- **Optimization is the endgame** — write the best bot
- **AI can't solve the strategy** — knowing the API doesn't give you the optimal algorithm
- **It's the Big Bang Empire feeling** — your bot works while you sleep

## Core Design Principles

1. **API-first**: Every frontend action goes through a real API endpoint
2. **Progressive disclosure**: The game hints at automation as complexity grows
3. **Two audiences**: Fun for clickers AND for hackers
4. **Serverless**: Hosted on Vercel, zero infrastructure to manage
5. **Open source**: MIT, community-driven
6. **Minimal scope**: Ship fast, iterate based on feedback

## Functional Requirements

### The Tycoon Game

#### Riders
- Hire riders with different stats (speed, reliability, city knowledge)
- Riders have energy that regenerates over time
- Riders can be upgraded (better bike, training, equipment)
- Riders have morale affected by workload and pay

#### Orders
- Orders arrive dynamically (more during peak hours)
- Each order has: pickup location, dropoff location, urgency, reward
- Urgency levels: normal (1x), urgent (1.5x), express (2x reward)
- Orders expire if not assigned in time
- Customer satisfaction affects future order volume

#### Economy
- Revenue from completed deliveries
- Costs: rider salaries, vehicle maintenance, zone fees
- Dynamic pricing based on demand
- Cooperative treasury for shared expenses

#### Cooperative Mechanics
- Riders vote on key decisions (expand to new city? raise prices?)
- Profit sharing model (equal split vs performance-based)
- Cooperative reputation affects order quality

#### Expansion
- Start in one city zone
- Unlock new zones and cities as you grow
- Each city has different characteristics (density, traffic, weather)

#### Events
- Random events: storms, strikes, competitor entry, food festival
- Events affect order volume, delivery times, rider morale
- Some events require player decisions

### The Hacking Layer

#### API Surface
```
POST /api/auth/register
POST /api/auth/login
GET  /api/player/profile
GET  /api/player/stats
GET  /api/riders
POST /api/riders/hire
POST /api/riders/upgrade
GET  /api/orders
GET  /api/orders/available
POST /api/orders/assign
POST /api/orders/complete
GET  /api/market
POST /api/market/buy
POST /api/market/sell
GET  /api/zones
POST /api/zones/unlock
GET  /api/leaderboard
GET  /api/leaderboard/hackers
GET  /api/events
POST /api/coop/vote
```

#### Progressive Automation Hints
- **Early game** (3 riders, 10 orders/day): Fully manageable by clicking
- **Mid game** (20 riders, 200 orders): Game says "You're losing orders. Your competitors use routing algorithms. Maybe you should automate..."
- **Late game**: An "API" tab appears in the menu with a hint: `GET /api/v1/orders`
- **Endgame**: Features that ONLY exist via API (no UI) — bulk operations, advanced analytics, secret contracts

#### Hidden Endpoints (not in docs)
- `/api/analytics/demand-forecast` — Predict future order volume
- `/api/contracts/negotiate` — Better rates with restaurants
- `/api/riders/optimal-route` — Server-calculated optimal routes
- `/api/market/insider` — Market trends before they happen

#### Hacking Stages

Stages are additive — each one builds on the previous. The challenge is not just discovering the API (AI agents make that trivial in 2026), but using it effectively to build the best bot.

**Design philosophy**: Discovery is easy. Optimization is hard. The leaderboard is the real competition.

| Stage | Name | What's New | Skills Learned |
|-------|------|-----------|----------------|
| 1 | Plain Sight | Open REST API, JWT + refresh | HTTP basics, DevTools, curl, JWT refresh |
| 2 | Signed & Sealed | HMAC-protected bulk endpoints | HMAC signing, JS code reading, bulk operations |
| 3 | Data Edge | Analytics endpoints (HMAC-protected) | Data-driven optimization, forecasting |
| 4 | Minified Madness | Obfuscated JS, hashed endpoint names | JS deobfuscation, AST analysis |
| 5 | Rate & Wait | Rate limiting + hidden batch endpoint | Rate limit evasion, timing |
| 6 | Socket Dungeon | WebSocket with custom protocol | WebSocket, custom protocols |
| 7 | Binary Protocol | Protobuf without public schema | Protobuf, binary analysis |
| 8 | The Gauntlet | All combined | Everything |

### Leaderboards

| Board | Metric | Who |
|-------|--------|-----|
| 🏆 Tycoon | Total profit | All players |
| 🤖 Hacker | Total profit | API users only |
| 🔍 Explorer | Endpoints discovered | API users only |

## Non-Functional Requirements

- **Serverless**: Hosted on Vercel, zero infrastructure to manage
- **Fast**: API response < 50ms, lazy game tick on request
- **Responsive**: Playable on mobile (but optimized for desktop)
- **Free tier**: Runs entirely on free tiers (Vercel + Neon) at launch
- **Lazy tick**: Game state computed on-demand (no background processes), perfect for serverless

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Backend | Hono (TypeScript) | Lightweight, fast, multi-runtime, zero-config on Vercel |
| Runtime | Node.js 22 (LTS) | Stable, battle-tested, full ecosystem compatibility |
| Database | PostgreSQL (Neon) | Serverless, scale-to-zero, free tier |
| ORM | Drizzle | Type-safe, SQL-first, native Neon support |
| Frontend | Svelte 5 + SvelteKit | Minimal boilerplate, compiler-driven, great DX |
| UI Components | shadcn-svelte | Accessible, copy-paste components, Tailwind CSS |
| Build | Vite (frontend), tsdown (shared packages) | Fast, standard |
| Test | Vitest | Fast, compatible with Vite |
| Lint | Biome | Fast, replaces ESLint+Prettier |
| Deploy | Vercel | Auto-deploy from GitHub, serverless |
| Auth | jose (JWT) + arctic (OAuth) | jose for tokens, arctic for OAuth flows (GitHub/Google) |
| Validation | Zod | Runtime type safety |

## Implementation Phases

### Phase 0 — MVP ✅
- [x] Backend: Hono + Neon Postgres + Drizzle + basic auth
- [x] Game: Riders, orders, assign, deliver, get paid
- [x] Frontend: SvelteKit + shadcn-svelte (minimal, functional)
- [x] Stage 1: Plain REST API (no protection)
- [x] Deploy to Vercel (Hono embedded in SvelteKit via hooks.server.ts)
- [x] README with concept explanation
- [ ] Post on r/incremental_games for feedback

### Phase 1 — Core Game ✅
- [x] Security hardening (PBKDF2 passwords, CORS lockdown, rate limiting)
- [x] Zones: 5 Milan zones with unlock, fees, zone-aware orders
- [x] Progression system (levels from deliveries, milestones with unlocks)
- [x] Rider upgrades (speed, reliability, cityKnowledge, stamina)
- [x] Delivery failure mechanics (reliability + cityKnowledge based, deterministic)
- [x] Time-based order generation (rate scales with level/reputation)
- [x] Dark theme (light/dark/system toggle)
- [x] Live UI (auto-refresh 15s, real-time countdowns)
- [x] Economy: dynamic pricing, weather bonuses
- [x] Events: random events affecting gameplay
- [x] Leaderboard (basic)
- [x] OAuth login with arctic (GitHub, Google)
- [x] JWT hardening (short expiry, refresh tokens) — baseline security
- [x] Stage 2: HMAC-protected bulk endpoints (batch assign, bulk upgrade)
- [x] Stage 3: Analytics endpoints (demand forecast, rider efficiency)
- [x] Challenge descriptions for stages 1-3

### Phase 2 — Depth (month 3-4) ✅
- [x] Multiple cities (Milano, Bologna, Firenze, Torino — 14 zones)
- [x] Cooperative mechanics (policy voting, profit sharing, tick integration)
- [x] Hidden endpoints (contracts, optimal-route, market insider)
- [x] Stage 4: Obfuscated endpoints (hashed paths, 2x rate limit)
- [x] Stage 5: Rate limiting + pipeline super-batch + anti-bot timing guard
- [x] Official solution bots for stages 1-5

### Phase 3 — Polish (month 5-6)
- [ ] Achievements system
- [ ] API-only features (no UI)
- [ ] Polish: better UI, tutorial, onboarding

### Phase 4 — Community (month 6+)
- [ ] Documentation site
- [ ] Community-submitted stages
- [ ] Seasonal leaderboard resets
- [ ] Mobile PWA
- [ ] Mod support (custom cities/events)

### Future — Advanced Stages (when infra supports it)
- [ ] Stage 6: WebSocket protocol
- [ ] Stage 7: Protobuf
- [ ] Stage 8: The Gauntlet

---

*Project: drop-coop*
*Tagline: "Your delivery co-op, your rules."*
*GitHub: Zweer/drop-coop*
*Decision made: 2026-03-14*
*Status: Phase 0 complete, Phase 1 complete, Phase 2 complete*
*Last updated: 2026-03-17*
