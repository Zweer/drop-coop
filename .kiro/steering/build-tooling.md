# Build & Tooling

## Tech Stack

| Tool | Purpose |
|------|---------|
| **Hono** | HTTP framework (backend API) |
| **Node.js 22** | Runtime (LTS) |
| **PostgreSQL (Neon)** | Serverless database (scale-to-zero) |
| **Drizzle ORM** | Type-safe ORM, SQL-first |
| **SvelteKit** | Frontend framework + routing |
| **Svelte 5** | UI framework (runes, compiler-driven) |
| **shadcn-svelte** | UI component library (Tailwind CSS) |
| **Vite** | Frontend build + dev server |
| **Vitest** | Tests |
| **Biome** | Lint + format |
| **tsdown** | Shared package build |
| **Vercel** | Hosting (serverless, auto-deploy) |

## Project Structure

```
drop-coop/
├── packages/
│   ├── api/                     # Backend (Hono API, embedded in SvelteKit)
│   │   ├── src/
│   │   │   ├── index.ts         # Hono app entry (Vercel serverless)
│   │   │   ├── app.ts           # Hono app setup (CORS, rate limiting, routes)
│   │   │   ├── routes/          # Route handlers
│   │   │   │   ├── auth.ts      # Register, login (PBKDF2)
│   │   │   │   ├── orders.ts    # Order listing, assign
│   │   │   │   ├── riders.ts    # Rider hire, upgrade
│   │   │   │   ├── player.ts    # Profile + progression
│   │   │   │   └── zones.ts     # Zone listing, unlock
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts      # JWT auth middleware
│   │   │   │   └── rate-limit.ts # In-memory rate limiter
│   │   │   ├── models/          # Drizzle table definitions
│   │   │   │   ├── players.ts
│   │   │   │   ├── riders.ts
│   │   │   │   ├── orders.ts
│   │   │   │   ├── zones.ts
│   │   │   │   └── index.ts     # Re-exports all models
│   │   │   ├── services/
│   │   │   │   └── tick.ts      # Lazy tick (DB read → game engine → DB write)
│   │   │   └── db/
│   │   │       └── index.ts     # Neon DB connection
│   │   ├── drizzle/             # Generated migrations
│   │   ├── test/                # API route tests (Vitest)
│   │   └── package.json
│   │
│   ├── web/                     # Frontend (SvelteKit → Vercel)
│   │   ├── src/
│   │   │   ├── hooks.server.ts  # Embeds Hono API via SvelteKit hooks
│   │   │   ├── app.html         # HTML shell (dark theme script)
│   │   │   ├── app.css          # Tailwind + shadcn-svelte theme
│   │   │   ├── routes/
│   │   │   │   ├── +page.svelte         # Landing / login redirect
│   │   │   │   ├── login/+page.svelte   # Login / register
│   │   │   │   └── dashboard/           # Main game UI
│   │   │   │       ├── +layout.svelte   # Nav, header, progression bar
│   │   │   │       ├── +page.svelte     # Dashboard (stats, orders, actions)
│   │   │   │       ├── riders/          # Rider management + upgrades
│   │   │   │       └── orders/          # Order list + assignment
│   │   │   └── lib/
│   │   │       ├── api.ts               # API client (fetch wrapper)
│   │   │       ├── stores/
│   │   │       │   ├── profile.svelte.ts # Player profile state
│   │   │       │   ├── tick.svelte.ts    # Auto-refresh (15s interval)
│   │   │       │   └── theme.svelte.ts   # Dark/light/system toggle
│   │   │       ├── components/ui/       # shadcn-svelte components
│   │   │       └── hooks/               # Svelte hooks (is-mobile)
│   │   └── package.json
│   │
│   └── game/                    # Game logic (pure functions, shared)
│       ├── src/
│       │   ├── engine.ts        # Core game loop (lazy tick)
│       │   ├── economy.ts       # Revenue, costs, failure, upgrades
│       │   ├── progression.ts   # Levels, milestones
│       │   ├── zones.ts         # Zone definitions (5 Milan zones)
│       │   ├── types.ts         # Shared types (Player, Rider, Order)
│       │   └── index.ts         # Re-exports
│       ├── test/                # Game logic tests (Vitest)
│       └── package.json
│
├── challenges/                  # Challenge docs (per stage)
├── solutions/                   # Official bot solutions
├── package.json                 # Root (npm workspaces)
├── biome.json
├── tsconfig.json
└── vitest.config.ts
```

## Monorepo

### Workspaces
- npm workspaces with `packages/*`
- Consistent with other projects (FlowRAG, bonvoy)
- `@drop-coop/api`, `@drop-coop/web`, `@drop-coop/game` package names

### Shared Package (`@drop-coop/game`)
- Pure game logic functions (no DB, no HTTP)
- Used by `api` for game state computation
- Used by `web` for types and constants
- Built with tsdown

## Development Workflow

### Initial Setup
```bash
npm install
npm run dev                  # Starts both API + web
```

### Development
```bash
npm run dev -w packages/api  # API only (Hono dev server)
npm run dev -w packages/web  # Frontend only (Vite dev server)
npm run dev                  # Both (concurrently)
```

### Testing
```bash
npm test                     # Run all tests
npm run test:coverage        # With coverage
```

### Database
```bash
npm run db:generate -w packages/api  # Generate migration from schema changes
npm run db:migrate -w packages/api   # Run migrations
npm run db:studio -w packages/api    # Open Drizzle Studio
```

### Deploy
Push to GitHub → Vercel auto-deploys both API and web.

## Database

### PostgreSQL on Neon
- Serverless: scales to zero when idle
- Free tier: 0.5 GB storage, 100 compute-hours/month
- Connection via `@neondatabase/serverless` driver (HTTP)
- Drizzle ORM for type-safe queries and migrations

### Lazy Tick
- No background processes (serverless-compatible)
- Game state computed on-demand when player makes a request
- Server calculates "what happened since last request" and updates state
- Perfect for idle/tycoon games on serverless

## Environment Variables

### Development (`.env.local`)
- `DATABASE_URL` — Neon connection string

### Production (Vercel)
- `DATABASE_URL` — Neon connection string (set in Vercel dashboard)
- `JWT_SECRET` — JWT signing key
- `STAGE` — Active hacking stage (default: 1)
