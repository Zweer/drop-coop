# Architecture Diagrams

## System Overview

```
┌─────────────────────────────────────────────────┐
│                   Vercel                         │
│                                                  │
│  ┌──────────────┐       ┌────────────────────┐  │
│  │  SvelteKit   │       │   Hono API         │  │
│  │  (frontend)  │──────▶│   (serverless)     │  │
│  │              │ fetch  │                    │  │
│  │  Svelte 5    │◀──────│   /api/*           │  │
│  │  shadcn      │  JSON  │                    │  │
│  └──────────────┘       └────────┬───────────┘  │
│                                  │               │
└──────────────────────────────────┼───────────────┘
                                   │
                          ┌────────▼───────────┐
                          │  Neon PostgreSQL    │
                          │  (serverless)       │
                          │  scale-to-zero      │
                          └────────────────────┘
```

## Package Dependencies

```
@drop-coop/web ──imports──▶ @drop-coop/game (types, constants)
       │
       │ hooks.server.ts
       │ embeds
       ▼
@drop-coop/api ──imports──▶ @drop-coop/game (engine, economy)
       │
       │ Drizzle ORM
       ▼
   PostgreSQL
```

## Request Flow (Lazy Tick)

```
Player clicks "Assign"
       │
       ▼
  SvelteKit page
       │ fetch('/api/orders/assign')
       ▼
  hooks.server.ts ──▶ Hono router
                          │
                     ┌────▼────┐
                     │ Auth MW │ verify JWT
                     └────┬────┘
                          │
                     ┌────▼────────┐
                     │ Rate Limit  │
                     └────┬────────┘
                          │
                     ┌────▼────────────────┐
                     │ Lazy Tick            │
                     │ "what happened since │
                     │  last request?"      │
                     │                      │
                     │ • generate orders    │
                     │ • complete deliveries│
                     │ • apply events       │
                     │ • update energy      │
                     └────┬────────────────┘
                          │
                     ┌────▼────────┐
                     │ Route logic │ assign rider
                     └────┬────────┘
                          │
                     ┌────▼────┐
                     │   DB    │ read/write
                     └────┬────┘
                          │
                     JSON response
```

## Hacking Stages Progression

```
Stage 1: Plain REST ──▶ DevTools, curl, JWT
       │
Stage 2: HMAC bulk ──▶ find key in JS, sign requests
       │
Stage 3: Analytics ──▶ data-driven optimization
       │
Stage 4: Obfuscated ──▶ deobfuscate, reconstruct API
       │
Stage 5: Rate limits ──▶ batch endpoint, jitter
       │
Stage 6: WebSocket ──▶ custom protocol
       │
Stage 7: Protobuf ──▶ reverse-engineer schema
       │
Stage 8: Gauntlet ──▶ everything combined
```

## Database Schema (Core)

```
players
  ├── id, username, email, passwordHash
  ├── level, xp, reputation, money
  ├── currentZone, unlockedZones[]
  └── lastTickAt

riders
  ├── id, playerId, name
  ├── speed, reliability, cityKnowledge, stamina
  ├── energy, morale
  ├── bikeLevel, gpsLevel, rainGear, cargoRack
  └── status (idle/delivering/resting)

orders
  ├── id, playerId, zoneId
  ├── pickup, dropoff, distance
  ├── urgency, reward, weight
  ├── status (available/assigned/delivering/completed/expired)
  ├── assignedRiderId
  └── expiresAt, completesAt
```
