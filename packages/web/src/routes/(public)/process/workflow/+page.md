---
title: Vibe Coding in Practice
---

# 🤖 Vibe Coding in Practice

## What is vibe coding?

"Vibe coding" is a term coined by Andrej Karpathy (co-founder of OpenAI) to describe a new way of building software: **you describe what you want, and an AI writes the code**.

You don't write code. You don't debug. You don't look up documentation. You describe the *vibe* — what the thing should do, how it should feel — and the AI translates that into working software.

drop-coop was built entirely this way. One person directed. An AI agent implemented. The conversation *is* the source code.

## How it actually works

### The roles

| | Human (Director) | AI (Builder) |
|---|---|---|
| **Does** | Describes features, makes decisions, reviews results | Writes code, runs tests, fixes bugs, iterates |
| **Doesn't** | Write code, debug, look up APIs | Make product decisions, choose priorities |
| **Controls** | What gets built, in what order | How it gets built, technically |

### The loop

Every feature follows the same pattern:

1. **Human describes** — "Add an achievements system. 22 badges, auto-check on every game tick, show toasts when unlocked."
2. **AI proposes a plan** — "I'll add an achievements table, check conditions in the tick service, add an API endpoint, and a dashboard page. 5 steps."
3. **Human approves** (or adjusts) — "Looks good, go."
4. **AI implements** — writes code, runs the full test suite (325 tests), fixes any failures
5. **AI reports** — "Done. All tests pass. Here's the commit message."
6. **Human commits** — reviews the diff, pushes to git

The human never touches the code. The AI never makes product decisions.

### When things go wrong

The AI makes mistakes. A test fails. A build breaks. An accessibility check flags an issue.

The difference from traditional development: **the AI fixes its own mistakes**. It reads the error, understands the cause, applies a fix, and re-runs the tests. The human doesn't need to understand the error — they just wait for "all tests pass."

In this project, the AI's self-correction loop ran hundreds of times. The human saw the final result, not the intermediate failures.

## What was built

In **3 days** of conversation (March 14-17, 2026), the following was built from scratch:

### Phase 0 — MVP (day 1)
Database schema, authentication, game engine, API routes, frontend dashboard. A playable game.

### Phase 1 — Core game (day 1-2)
5 city zones, progression system, rider upgrades, delivery failures, dynamic pricing, weather events, leaderboard, OAuth login, hacking stages 2-3.

### Phase 2 — Depth (day 2-3)
4 cities with 14 zones, cooperative mechanics (voting, profit sharing), hidden API endpoints, hacking stages 4-5, official solution bots for all stages.

### Phase 3 — Polish (day 3)
22 achievements, API-only features, onboarding checklist, achievement notifications, public documentation site (what you're reading now).

## The numbers

| Metric | Value |
|--------|-------|
| Development time | 3 days |
| Lines of code written by human | 0 |
| Automated tests | 325 |
| Code coverage | 97.95% |
| Hacking stages | 5 (of 8 designed) |
| Cities | 4 (14 zones) |
| Achievements | 22 |
| Database migrations | 10 |
| Test files | 17 |
| Solution bots | 5 |

## What this means

### For non-technical people

Software development is traditionally slow and expensive. A project like drop-coop — with a backend, frontend, database, authentication, game logic, security layers, and comprehensive testing — would typically take a small team several weeks or months.

With AI-assisted development, one person with a clear vision built it in 3 days. The quality isn't compromised — 98% test coverage is higher than most professional projects.

This doesn't mean developers are obsolete. It means the bottleneck shifts: **the hard part is no longer writing code, it's knowing what to build**. Vision, product sense, and decision-making become the scarce skills.

### For technical people

The AI isn't just autocompleting lines. It's:
- Reading project specs and steering docs for context
- Proposing multi-step implementation plans
- Writing idiomatic TypeScript with proper types
- Creating comprehensive test suites (unit, E2E, browser)
- Running the full CI pipeline (`tsc` → `biome` → `vitest` → `playwright`)
- Debugging its own failures and iterating
- Suggesting conventional commit messages

The human's role is architectural: defining the spec, choosing the tech stack, making trade-offs (e.g., "defer WebSocket stages until infra supports it"), and reviewing the output.

## Key lessons learned

1. **Specs are everything** — The AI builds what the spec says. Vague specs = vague code. Detailed specs = precise implementation.

2. **Tests are the safety net** — Without tests, you can't trust AI-generated code. With 325 tests, every change is verified automatically.

3. **The human makes fewer but bigger decisions** — Instead of 100 small coding decisions per day, the human makes 10 strategic decisions. Each one has more impact.

4. **Iteration is fast** — "Add achievements" → working feature with tests in ~30 minutes. Traditional development: days.

5. **The conversation is the documentation** — The back-and-forth between human and AI captures *why* decisions were made, not just *what* was built.

---

## Technical Details

### Tools used

- **AI Agent**: Kiro (Claude-based, with file system and terminal access)
- **Context system**: `.kiro/specs/` and `.kiro/steering/` loaded at session start
- **Verification pipeline**: `tsc --noEmit` → `biome check` → `npm test -- --run` → `npx playwright test`
- **Language**: Italian for conversation, English for all code and documentation

### The conversation dynamic

The human communicates in Italian, describing features conversationally. The AI responds in Italian for discussion but writes all code, comments, commit messages, and documentation in English.

Example exchange:

> **Human**: "aggiungiamo gli achievement — tipo 22 badge, check automatico a ogni tick, toast quando si sbloccano"
>
> **AI**: "Piano: 1) tabella achievements + migrazione, 2) logica check nel tick, 3) endpoint API, 4) pagina dashboard, 5) toast component. Procedo?"
>
> **Human**: "vai"
>
> **AI**: *implements, tests, reports* — "Fatto. 325 test passano, coverage 97.95%."

### Git workflow

The AI never commits. It suggests commit messages following conventional commits (`feat:`, `fix:`, `test:`). The human reviews the diff and commits manually. This keeps the human in control of the project history.

### What the AI reads

At the start of each session, the AI receives:
- All files in `.kiro/specs/` (requirements, game design, business plan)
- All files in `.kiro/steering/` (code style, testing strategy, architecture, interaction patterns)
- `README.md`
- A summary of the previous conversation (if continuing a session)

This context (~3000 words) gives the AI enough understanding to implement features without asking basic questions about the project.
