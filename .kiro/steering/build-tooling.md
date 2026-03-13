# Build & Tooling

## Tech Stack

| Tool | Purpose |
|------|---------|
| **Hono** | HTTP framework (backend API) |
| **better-sqlite3** | SQLite database |
| **Vite** | Frontend build + dev server |
| **Vue 3** or **React** | Frontend UI (TBD) |
| **Vitest** | Tests |
| **Biome** | Lint + format |
| **Docker Compose** | One-command deployment |
| **tsdown** or **tsx** | Backend build/run |

## Project Structure

```
drop-coop/
├── server/                  # Backend
│   ├── src/
│   │   ├── index.ts         # Entry point (Hono app)
│   │   ├── api/             # Route handlers
│   │   │   ├── auth.ts      # Login, register
│   │   │   ├── orders.ts    # Order management
│   │   │   ├── riders.ts    # Rider management
│   │   │   ├── market.ts    # Buy/sell equipment
│   │   │   └── leaderboard.ts
│   │   ├── game/            # Game logic (pure functions)
│   │   │   ├── engine.ts    # Core game loop
│   │   │   ├── economy.ts   # Pricing, costs, revenue
│   │   │   ├── riders.ts    # Rider stats, assignment
│   │   │   ├── orders.ts    # Order generation
│   │   │   ├── events.ts    # Random events
│   │   │   └── coop.ts      # Cooperative mechanics
│   │   ├── stages/          # Hacking stage middleware
│   │   │   ├── stage1.ts    # Plain REST
│   │   │   ├── stage2.ts    # JWT + hidden endpoints
│   │   │   ├── stage3.ts    # HMAC signing
│   │   │   ├── stage4.ts    # Obfuscated endpoints
│   │   │   ├── stage5.ts    # Rate limiting + batch
│   │   │   ├── stage6.ts    # WebSocket protocol
│   │   │   ├── stage7.ts    # Protobuf
│   │   │   └── stage8.ts    # The Gauntlet
│   │   ├── db/
│   │   │   ├── schema.ts    # Table definitions
│   │   │   ├── migrations.ts
│   │   │   └── queries.ts   # Prepared statements
│   │   └── types.ts
│   ├── test/
│   ├── package.json
│   └── tsconfig.json
│
├── client/                  # Frontend
│   ├── src/
│   │   ├── App.vue          # (or App.tsx)
│   │   ├── views/           # Pages
│   │   ├── components/      # UI components
│   │   └── api/             # API client
│   ├── package.json
│   └── vite.config.ts
│
├── challenges/              # Challenge docs (per stage)
│   ├── stage1.md
│   └── ...
│
├── solutions/               # Official bot solutions
│   ├── stage1/
│   │   └── bot.ts
│   └── ...
│
├── docker-compose.yml
├── Dockerfile
├── package.json             # Root (workspaces)
├── biome.json
├── vitest.config.ts
└── tsconfig.json
```

## Development Workflow

### Initial Setup
```bash
npm install
npm run dev                  # Starts both server + client
```

### Development
```bash
npm run dev:server           # Backend only (with hot reload)
npm run dev:client           # Frontend only (Vite dev server)
npm run dev                  # Both (concurrently)
```

### Testing
```bash
npm test                     # Run all tests
npm run test:coverage        # With coverage
```

### Docker
```bash
docker compose up            # Run everything
docker compose up --build    # Rebuild and run
```

## Database

### SQLite
- Zero configuration, file-based
- `drop-coop.db` in project root (gitignored)
- Migrations run on startup
- WAL mode for concurrent reads

### Why SQLite
- No external database to install
- Self-contained (one file)
- Fast enough for a game (thousands of players)
- Easy to reset (delete the file)

## Environment Variables

### Development
- No env vars needed for local development
- SQLite file created automatically

### Production (Docker)
- `PORT` — Server port (default: 3000)
- `DATABASE_PATH` — SQLite file path (default: `./drop-coop.db`)
- `STAGE` — Active hacking stage (default: 1)
- `JWT_SECRET` — JWT signing key (auto-generated if not set)
