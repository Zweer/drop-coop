---
title: Testing Strategy
---

# 🧪 Testing Strategy

drop-coop has three layers of testing, achieving **97.95% line coverage**.

## Test Pyramid

| Layer | Framework | Count | What it tests |
|-------|-----------|-------|---------------|
| Unit | Vitest | ~80 | Game logic (engine, economy, events, achievements) |
| E2E API | Vitest + PGlite | ~230 | Full API routes with in-memory Postgres |
| Smoke | Playwright | 24 | Browser flows (register, hire, assign, navigate) |

Total: **325 tests** across 17 test files.

## No Real Database in Tests

Every test uses **PGlite** — an in-memory PostgreSQL compiled to WebAssembly. Each E2E test file gets a fresh database with all migrations applied. No Docker, no external services, no cleanup needed.

```typescript
const { db, close } = await createTestDb(); // PGlite
vi.doMock('../src/db/index.ts', () => ({ db }));
const { app } = await import('../src/app.ts');
```

## E2E Test Organization

| File | Focus | Tests |
|------|-------|-------|
| `e2e.test.ts` | Full game loop | 16 |
| `e2e-edge-cases.test.ts` | Error handling | 28 |
| `e2e-hacking.test.ts` | HMAC, batch, analytics | 13 |
| `e2e-mechanics.test.ts` | Energy, morale, events | 22 |
| `e2e-extended.test.ts` | Validation, CORS, rate limits | 47 |
| `e2e-phase3.test.ts` | Achievements, coop, pipeline | 39 |

## Coverage Philosophy

- Target: **95%+ lines** (achieved: 97.95%)
- `/* c8 ignore */` only for genuinely unreachable code (auth guards, random generation)
- Game logic: 100% coverage (pure functions, easy to test)
- API routes: 95%+ coverage (E2E tests cover happy + error paths)
- The only file below 95% is `timing-guard.ts` — intentionally disabled in tests via `process.env.VITEST`

## Playwright Smoke Tests

Browser tests run against the real SvelteKit app with PGlite backend:

```bash
npm run test:smoke  # starts dev server with USE_PGLITE=1
```

Coverage: landing page, auth flows, dashboard, riders, orders, zones, leaderboard, theme toggle, accessibility (axe-core).

## Demo Recording

A separate Playwright spec records a **video walkthrough** of the entire game with a visible cursor and click animations:

```bash
npm run demo  # outputs video to demo-results/
```
