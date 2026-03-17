---
title: Architecture & Steering
---

# 🏗️ Architecture & Steering

Steering documents in `.kiro/steering/` define how the project is built — not what, but how.

## Monorepo Structure

```
drop-coop/
├── packages/
│   ├── api/          # Hono backend (serverless on Vercel)
│   ├── web/          # SvelteKit frontend
│   └── game/         # Pure game logic (shared)
├── docs/
│   ├── challenges/   # Hacking stage descriptions
│   └── solutions/    # Official bot solutions
└── .kiro/
    ├── specs/        # Requirements & design
    └── steering/     # Code style, testing, architecture
```

## Key Architecture Decisions

### Lazy Tick (Serverless-Compatible)

No background processes. Game state is computed **on-demand** when a player makes a request. The server calculates "what happened since your last request" and updates state. Perfect for Vercel's serverless model.

### Three-Package Split

- **`@drop-coop/game`** — Pure functions, no DB, no HTTP. Game engine, economy, progression, events. Tested with unit tests.
- **`@drop-coop/api`** — Hono routes, Drizzle ORM, middleware. Tested with E2E tests against PGlite (in-memory Postgres).
- **`@drop-coop/web`** — SvelteKit frontend, shadcn-svelte components. Tested with Playwright smoke tests.

### API Embedded in SvelteKit

The Hono API is embedded in SvelteKit via `hooks.server.ts`. One deployment serves both frontend and API. No separate backend server.

## Steering Documents

### Code Style (`code-style.md`)
- TypeScript strict mode, no `any`
- ES modules, explicit types
- Biome for lint + format (not ESLint/Prettier)
- Minimal dependencies

### Testing (`testing.md`)
- Vitest for unit + E2E
- PGlite for in-memory Postgres (no real DB in tests)
- Playwright for browser smoke tests
- 97.95% line coverage target

### Architecture (`architecture.md`)
- System overview diagrams
- Request flow (lazy tick)
- Package dependency graph
- Database schema

### Interaction (`interaction.md`)
- Interview before implementing ambiguous requests
- Plan mode for multi-step tasks
- ASCII diagrams for architecture discussions
