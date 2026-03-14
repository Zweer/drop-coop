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
│   ├── api/                     # Backend (Hono API → Vercel serverless)
│   │   ├── src/
│   │   │   ├── index.ts         # Entry point (Hono app)
│   │   │   ├── routes/          # Route handlers
│   │   │   │   ├── auth.ts      # Login, register
│   │   │   │   ├── orders.ts    # Order management
│   │   │   │   ├── riders.ts    # Rider management
│   │   │   │   ├── market.ts    # Buy/sell equipment
│   │   │   │   └── leaderboard.ts
│   │   │   ├── middleware/       # Auth, stages, validation
│   │   │   └── db/
│   │   │       ├── schema.ts    # Drizzle table definitions
│   │   │       ├── migrate.ts   # Migration runner
│   │   │       └── index.ts     # DB connection (Neon)
│   │   ├── drizzle/             # Generated migrations
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/                     # Frontend (SvelteKit → Vercel)
│   │   ├── src/
│   │   │   ├── routes/          # SvelteKit pages
│   │   │   ├── lib/
│   │   │   │   ├── components/  # UI components
│   │   │   │   └── api.ts       # API client
│   │   │   └── app.html
│   │   ├── package.json
│   │   ├── svelte.config.js
│   │   └── vite.config.ts
│   │
│   └── game/                    # Game logic (pure functions, shared)
│       ├── src/
│       │   ├── engine.ts        # Core game loop (lazy tick)
│       │   ├── economy.ts       # Pricing, costs, revenue
│       │   ├── riders.ts        # Rider stats, assignment
│       │   ├── orders.ts        # Order generation
│       │   ├── events.ts        # Random events
│       │   └── types.ts         # Shared types
│       ├── package.json
│       └── tsconfig.json
│
├── challenges/                  # Challenge docs (per stage)
│   ├── stage1.md
│   └── ...
│
├── solutions/                   # Official bot solutions
│   ├── stage1/
│   │   └── bot.ts
│   └── ...
│
├── package.json                 # Root (workspaces)
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
