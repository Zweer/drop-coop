---
title: Testing & Quality
---

# 🧪 Testing & Quality

## Why testing matters here

When an AI writes all the code, how do you know it works? How do you trust it?

The answer is automated testing. Every feature has tests. Every change is verified. The AI doesn't just write code — it writes tests, runs them, and if something breaks, it fixes the code and re-runs until everything passes.

This is the quality guarantee: **325 tests, 97.95% code coverage, zero manual verification needed.**

## Three layers of confidence

### 1. Unit tests — "Does the math work?"

The game has formulas: delivery revenue, rider energy drain, level progression, event effects. These are pure math — given these inputs, expect this output. ~80 unit tests verify every formula and edge case.

Example: "A rider with reliability 6 and city knowledge 4 delivering in an unknown zone — does the failure probability match the design spec?" The test says yes or no.

### 2. API tests — "Does the server behave correctly?"

When a player (or bot) calls the API, does it respond correctly? Can you hire a rider? Assign an order? What happens if you try to assign an order that doesn't exist? What about HMAC signing — does it reject unsigned requests?

~230 tests cover every API endpoint, every error case, every hacking stage feature. Each test gets a fresh in-memory database, so tests never interfere with each other.

### 3. Browser tests — "Does it work in a real browser?"

24 Playwright tests open a real browser, register a player, hire riders, assign orders, navigate pages, toggle the theme, and check accessibility. If the button doesn't work after a page loads, the test catches it.

## The AI's testing loop

This is the key insight for AI-assisted development:

```
AI writes feature code
       ↓
AI writes tests for the feature
       ↓
AI runs all 325 tests
       ↓
  ┌─ All pass? → Done ✅
  └─ Something fails? → AI reads the error, fixes the code, re-runs
```

The AI doesn't ship code that fails tests. It iterates until the full suite passes. This loop ran hundreds of times during development — the human never had to debug a test failure.

## What "98% coverage" means

Code coverage measures how much of the code is exercised by tests. 97.95% means almost every line of code has been tested. The remaining ~2% is genuinely unreachable code (safety guards that can't trigger in practice).

For context: many professional projects target 80% coverage. This project exceeds that because the AI writes tests as part of its workflow, not as an afterthought.

---

## Technical Details

### Test pyramid

| Layer | Framework | Count | What it tests |
|-------|-----------|-------|---------------|
| Unit | Vitest | ~80 | Game engine, economy, events, achievements |
| E2E API | Vitest + PGlite | ~230 | Full API routes with in-memory Postgres |
| Smoke | Playwright | 24 | Browser flows, navigation, accessibility |

### PGlite — PostgreSQL in memory

Tests use PGlite (PostgreSQL compiled to WebAssembly). Each test file gets an isolated in-memory database with all migrations applied. No Docker, no external services.

```typescript
const { db, close } = await createTestDb()  // PGlite
vi.doMock('../src/db/index.ts', () => ({ db }))
const { app } = await import('../src/app.ts')
```

### E2E test files

| File | Focus | Tests |
|------|-------|-------|
| `e2e.test.ts` | Full game loop | 16 |
| `e2e-edge-cases.test.ts` | Error handling | 28 |
| `e2e-hacking.test.ts` | HMAC, batch, analytics | 13 |
| `e2e-mechanics.test.ts` | Energy, morale, events | 22 |
| `e2e-extended.test.ts` | Validation, CORS, rate limits | 47 |
| `e2e-phase3.test.ts` | Achievements, coop, pipeline | 39 |

### Coverage config

- Provider: v8 (via Vitest)
- Included: `packages/api/src/**`, `packages/game/src/**`
- Excluded: OAuth, models (schema-only), DB connection, types
- `/* c8 ignore */` used only for unreachable guards and timer cleanup

### Demo recording

A separate Playwright spec records a full video walkthrough with visible cursor and click animations:

```bash
npm run demo      # records WebM to demo-results/
npm run demo:gif  # converts to GIF in static/
```
