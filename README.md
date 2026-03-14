<div align="center">
  <h1>🚲 drop-coop</h1>
  <p><em>"Your delivery co-op, your rules."</em></p>
</div>

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

A browser-based delivery tycoon game with a hidden API hacking layer.

## What is this?

**drop-coop** is two games in one:

1. **A tycoon game** — Manage a delivery rider cooperative. Hire riders, accept orders, deliver food, grow your business. Playable entirely by clicking in the browser.

2. **A hacking sandbox** — The game runs on real API endpoints. As your co-op grows, manual management becomes impossible. The game nudges you to discover the API, reverse-engineer it, and write bots to automate your operations.

Your bot works while you sleep. When you wake up, you're ahead of everyone who played by hand.

## Why?

The creator used to bot a browser game called Big Bang Empire — reverse-engineering the API, sniffing requests, automating gameplay. That game is dead now. Instead of finding another game to hack, we built one where **hacking is a feature, not an exploit**.

## How it works

### For casual players

Click, manage, grow. A normal tycoon game.

### For hackers

Everything the frontend does goes through real API endpoints:

```bash
# Discover the API
curl http://localhost:3000/api/orders/available

# Assign a rider
curl -X POST http://localhost:3000/api/orders/assign \
  -H "Content-Type: application/json" \
  -d '{"riderId": "1", "orderId": "42"}'
```

As you progress, the game adds security layers (JWT, HMAC signing, obfuscation, WebSocket protocols, protobuf) — each one a new reverse engineering challenge.

### Hacking stages

| Stage | Name | Challenge |
|-------|------|-----------|
| 1 | Plain Sight | Discover the API with DevTools |
| 2 | Token Game | Handle JWT auth + find hidden endpoints |
| 3 | Signed & Sealed | Find HMAC key in obfuscated JS |
| 4 | Minified Madness | Deobfuscate frontend, reconstruct API map |
| 5 | Rate & Wait | Bypass rate limiting, find batch endpoint |
| 6 | Socket Dungeon | Implement WebSocket custom protocol |
| 7 | Binary Protocol | Reverse-engineer protobuf schema |
| 8 | The Gauntlet | All of the above combined |

### Leaderboards

- 🏆 **Tycoon** — Total profit (all players)
- 🤖 **Hacker** — Total profit (API users only)
- 🔍 **Explorer** — API endpoints discovered

## Quick start

Play at [dropcoop.vercel.app](https://dropcoop.vercel.app) (coming soon).

### Local development

```bash
npm install
npm run dev
```

Open http://localhost:5173 and start playing.

## Game mechanics

- **Riders** — Hire, upgrade, manage energy and morale
- **Orders** — Dynamic arrival based on time, zone, reputation
- **Economy** — Revenue, costs, dynamic pricing, weather bonuses
- **Zones & Cities** — Expand from one zone to multiple cities
- **Events** — Storms, festivals, strikes, competitor entry
- **Cooperative** — Riders vote on decisions, profit sharing

## Tech stack

| Component | Technology |
|-----------|-----------|
| Backend | Hono (TypeScript) |
| Runtime | Node.js 22 |
| Database | PostgreSQL (Neon) |
| ORM | Drizzle |
| Frontend | Svelte 5 + SvelteKit |
| UI | shadcn-svelte |
| Build | Vite + tsdown |
| Test | Vitest |
| Deploy | Vercel |

## Development

```bash
npm install
npm run dev          # Start API + frontend
npm test             # Run tests
```

## Roadmap

- [x] Concept and game design
- [ ] **Phase 0**: MVP — core game loop + stage 1
- [ ] **Phase 1**: Economy, events, stages 2-3
- [ ] **Phase 2**: Cities, co-op mechanics, stages 4-5
- [ ] **Phase 3**: WebSocket, protobuf, stages 6-8
- [ ] **Phase 4**: Community features, mobile PWA

## Contributing

This is an open source project. Contributions welcome — especially:
- New hacking stages
- New cities and events
- Game balance feedback
- Bot solutions (in `solutions/`)

## License

MIT
