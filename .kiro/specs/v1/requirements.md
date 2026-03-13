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
| **Platform** | Browser (self-hosted via Docker) |
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
4. **Self-hosted**: Docker Compose, zero external dependencies
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

Each stage adds a real security layer. Stages are selectable via config (default: stage 1).

| Stage | Name | Protection | Skills Learned |
|-------|------|-----------|----------------|
| 1 | Plain Sight | None (session cookie only) | HTTP basics, DevTools, curl |
| 2 | Token Game | JWT with 5min expiry + hidden endpoints | JWT, token refresh, API discovery |
| 3 | Signed & Sealed | HMAC-SHA256 request signing | HMAC, JS code reading |
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

- **Self-hosted**: `docker compose up` and play
- **Zero external deps**: SQLite, no Redis/Postgres/etc.
- **Fast**: Game tick < 100ms, API response < 50ms
- **Offline-capable**: Works without internet (local Docker)
- **Responsive**: Playable on mobile (but optimized for desktop)

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Backend | Hono (TypeScript) | Lightweight, fast, great DX |
| Database | SQLite (better-sqlite3) | Zero config, self-contained |
| Frontend | Vue 3 or React (TBD) | Simple, the focus is the backend |
| Build | Vite | Fast, standard |
| Test | Vitest | Fast, compatible with Vite |
| Lint | Biome | Fast, replaces ESLint+Prettier |
| Deploy | Docker Compose | One command |
| Auth | jose (JWT) | Standard, lightweight |
| Validation | Zod | Runtime type safety |

## Implementation Phases

### Phase 0 — MVP (2-3 weekends)
- [ ] Backend: Hono + SQLite + basic auth
- [ ] Game: Riders, orders, assign, deliver, get paid
- [ ] Frontend: Minimal UI (functional, not pretty)
- [ ] Stage 1: Plain REST API (no protection)
- [ ] Docker Compose
- [ ] README with concept explanation
- [ ] Post on r/incremental_games for feedback

### Phase 1 — Core Game (month 1-2)
- [ ] Economy: costs, revenue, dynamic pricing
- [ ] Events: random events affecting gameplay
- [ ] Zones: multiple delivery zones
- [ ] Stage 2: JWT authentication
- [ ] Stage 3: HMAC signing
- [ ] Leaderboard (basic)
- [ ] Challenge descriptions for stages 1-3

### Phase 2 — Depth (month 3-4)
- [ ] Cooperative mechanics (voting, profit sharing)
- [ ] Multiple cities
- [ ] Rider upgrades and progression
- [ ] Stage 4: Obfuscated endpoints
- [ ] Stage 5: Rate limiting + batch
- [ ] Hidden endpoints (analytics, contracts)
- [ ] Official solution bots for stages 1-5

### Phase 3 — Advanced (month 5-6)
- [ ] Stage 6: WebSocket protocol
- [ ] Stage 7: Protobuf
- [ ] Stage 8: The Gauntlet
- [ ] Achievements system
- [ ] API-only features (no UI)
- [ ] Polish: better UI, sound, tutorial

### Phase 4 — Community (month 6+)
- [ ] Documentation site
- [ ] Community-submitted stages
- [ ] Seasonal leaderboard resets
- [ ] Mobile PWA
- [ ] Mod support (custom cities/events)

---

*Project: drop-coop*
*Tagline: "Your delivery co-op, your rules."*
*GitHub: Zweer/drop-coop*
*Decision made: 2026-03-14*
*Status: Requirements complete, implementation not started*
