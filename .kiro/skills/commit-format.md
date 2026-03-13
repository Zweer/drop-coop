# Commit Message Format

**IMPORTANT**: The agent NEVER commits, pushes, or creates tags. The developer handles all git operations manually.

## Format

Use conventional commits with gitmoji as text (not emoji):

```
type(scope): :emoji_code: short description

Detailed explanation of what changed and why.
```

## Types

- `feat` — New feature (`:sparkles:`)
- `fix` — Bug fix (`:bug:`)
- `perf` — Performance improvement (`:zap:`)
- `docs` — Documentation (`:memo:`)
- `chore` — Maintenance tasks (`:wrench:`, `:arrow_up:`)
- `refactor` — Code refactoring (`:recycle:`)
- `test` — Tests (`:white_check_mark:`)
- `style` — Code formatting (`:art:`)

## Scopes

- `server` — Backend API and game logic
- `client` — Frontend UI
- `game` — Game mechanics and economy
- `stage` — Hacking stages
- `db` — Database schema and queries
- `api` — API routes
- `docs` — Documentation and challenges

## Examples

```
feat(game): :sparkles: add rider assignment algorithm

Riders are assigned to orders based on proximity, speed, and current load.
Uses a weighted scoring system to find the optimal rider.
```

```
feat(stage): :sparkles: add JWT authentication for stage 2

Stage 2 requires JWT tokens with 5-minute expiry.
Hidden endpoint /api/secret-shop accessible only with valid token.
```

```
fix(api): :bug: fix order revenue calculation

Revenue was not accounting for urgency multiplier.
Normal orders: 1x, urgent: 1.5x, express: 2x.
```
