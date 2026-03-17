---
title: Architecture Decisions
---

# 🏗️ Architecture Decisions

## The big picture

drop-coop is a web application that runs entirely on free infrastructure. Players open a browser, play the game, and (if they're hackers) interact with the same API the frontend uses. There's no separate backend server — everything is deployed as a single unit.

The key constraint: **zero infrastructure to manage**. No servers to maintain, no Docker containers, no DevOps. Push code to GitHub, it deploys automatically.

## Key decisions and why

### "One app, not two"

The game API and the website are the same application. When a player clicks "Assign Order", the browser calls the API. When a hacker writes a bot, it calls the same API. One codebase, one deployment.

*Why?* Simplicity. A separate backend would mean two deployments, two domains, CORS configuration, and double the maintenance. Embedding the API in the frontend framework (SvelteKit) means everything deploys together.

### "Compute on demand, not always-on"

The game doesn't run a server 24/7. Instead, it uses **serverless functions** — small pieces of code that run only when someone makes a request. When nobody's playing, the cost is zero.

The game state is calculated **on demand**: when you make a request, the server figures out "what happened since your last request" and updates everything at once. This is called a "lazy tick" — perfect for an idle game where things happen over time.

*Why?* Cost. An always-on server costs money. Serverless on Vercel's free tier costs nothing for a side project.

### "Three packages, clear boundaries"

The code is split into three packages:

1. **Game logic** — Pure math and rules. "If a rider with speed 7 delivers an order 3km away, how long does it take?" No database, no HTTP — just functions.
2. **API** — Handles HTTP requests, talks to the database, applies game logic. This is what players and bots interact with.
3. **Frontend** — The browser interface. Buttons, pages, visual feedback.

*Why?* The game logic is shared between the API (which uses it to process requests) and the frontend (which uses it for types and constants). Separating it means it can be tested independently with simple unit tests.

### "Real database, zero maintenance"

The database is PostgreSQL hosted on Neon — a serverless database that scales to zero when idle. No Docker, no local Postgres setup, no maintenance. In tests, we use PGlite — PostgreSQL compiled to WebAssembly that runs in memory.

*Why?* PostgreSQL is battle-tested and powerful. Neon makes it serverless. PGlite means tests don't need any external services.

---

## Technical Details

### Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Backend | Hono (TypeScript) | Lightweight, fast, runs on Vercel |
| Frontend | Svelte 5 + SvelteKit | Minimal boilerplate, compiler-driven |
| Database | PostgreSQL (Neon) | Serverless, scale-to-zero, free tier |
| ORM | Drizzle | Type-safe, SQL-first |
| UI | shadcn-svelte | Accessible components, Tailwind CSS |
| Deploy | Vercel | Auto-deploy from GitHub |

### Package dependency graph

```
@drop-coop/web ──imports──▶ @drop-coop/game (types, constants)
       │
       │ hooks.server.ts (embeds API)
       ▼
@drop-coop/api ──imports──▶ @drop-coop/game (engine, economy)
       │
       │ Drizzle ORM
       ▼
   PostgreSQL (Neon)
```

### Request flow (lazy tick)

```
Player clicks "Assign"
       │
  SvelteKit page → fetch('/api/orders/assign')
       │
  hooks.server.ts → Hono router
       │
  ┌────┴────┐
  │ Auth MW │ → verify JWT
  └────┬────┘
  ┌────┴──────────────┐
  │ Lazy Tick          │
  │ • generate orders  │
  │ • complete rides   │
  │ • apply events     │
  │ • update energy    │
  └────┬──────────────┘
  ┌────┴────────┐
  │ Route logic │ → assign rider to order
  └────┬────────┘
       │
  JSON response → UI updates
```

### Database schema (10 migrations)

Core tables: `players`, `riders`, `orders`, `zones`, `events`, `achievements`, `coop_votes`. All managed with Drizzle ORM migrations.
