# Testing Strategy

## Frameworks

| Framework | Scope | Command |
|-----------|-------|---------|
| **Vitest** | Unit + API E2E | `npm test` |
| **Playwright** | Browser smoke tests | `npm run test:smoke` |

Coverage: `npm run test:coverage` (Vitest only, v8 provider)

## Test Types

### Unit Tests — Game Logic (`packages/game/test/`)

Pure function tests for the game engine, economy, events, pool, zones.

```typescript
describe('Economy', () => {
  it('should calculate delivery revenue based on distance', () => {
    const revenue = calculateRevenue({ distance: 5, urgency: 'normal' })
    expect(revenue).toBe(12.5)
  })
})
```

Files: `engine.test.ts`, `economy.test.ts`, `events.test.ts`, `pool.test.ts`, `zones.test.ts`

### E2E Tests — API Endpoints (`packages/api/test/`)

Full API tests using Hono's `app.request()` with **PGlite** (in-memory Postgres). Each test file gets a fresh database with migrations applied.

```typescript
const { db, close } = await createTestDb()  // PGlite
vi.doMock('../src/db/index.ts', () => ({ db }))
const { app } = await import('../src/app.ts')
```

Helpers in `e2e-helpers.ts`: `createTestDb()`, `hmacSign()`, `registerPlayer()`, `createClient()`.

Files:
- `e2e.test.ts` — Full game loop (register → hire → assign → deliver → level up)
- `e2e-edge-cases.test.ts` — Auth, order, zone, upgrade, hire errors
- `e2e-hacking.test.ts` — HMAC batch/analytics, hacker/explorer leaderboard
- `e2e-mechanics.test.ts` — Energy, morale, salary, order generation, delivery, events
- `e2e-extended.test.ts` — Validation, CORS, rate limiting, multi-player

### Smoke Tests — Browser (`packages/web/test/`)

Playwright tests against the real SvelteKit app with PGlite backend. Tests the full browser experience: SSR, hydration, navigation, form submission.

```bash
npm run test:smoke  # starts SvelteKit dev server with USE_PGLITE=1
```

The dev server uses PGlite instead of Neon when `USE_PGLITE=1` is set (configured in `packages/api/src/db/index.ts`). Rate limits are relaxed in this mode.

Coverage: landing page, auth flows, dashboard, riders (hire/rest), orders, zones, leaderboard tabs, theme toggle, navigation.

**SvelteKit hydration caveat**: Playwright clicks elements as soon as they appear in the DOM, but Svelte event handlers aren't attached until hydration completes. Tests must wait for hydration before interacting (e.g., wait for a reactive element to appear after a state change).

## Database in Tests

- **Vitest E2E**: PGlite via `createTestDb()` — each test file gets an isolated in-memory DB
- **Playwright smoke**: PGlite via `USE_PGLITE=1` env var — single DB shared across all tests, unique usernames per test

No real Postgres needed for any test.

## Coverage

Config in `vitest.config.ts`:
- **Included**: `packages/api/src/**`, `packages/game/src/**`
- **Excluded**: `oauth.ts`, `models/**`, `db/index.ts`, `index.ts`, `types.ts`
- **Target**: 100% lines (achieved), ~93% branches (v8 implicit branches)

`/* c8 ignore */` used only for genuinely unreachable code:
- `!player` guards after auth middleware
- Timer-based cleanup (`setInterval`)
- Random event generation (tested in game unit tests)
- Data mapping functions (pure type conversions)

## Mocking

### When to Mock
- Time-dependent operations (`vi.useFakeTimers()`)
- Random number generation (seed for deterministic tests)

### When NOT to Mock
- Database — use PGlite (real SQL, in-memory)
- Game logic — test the real implementation
- API routes — test with real Hono app instance
