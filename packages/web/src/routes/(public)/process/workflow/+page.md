---
title: AI-Assisted Workflow
---

# 🤖 AI-Assisted Workflow

drop-coop was built as a proof of concept for **AI-assisted development**. Here's how the human-AI collaboration works.

## Roles

| Role | Who | Responsibility |
|------|-----|----------------|
| **Director** | Human | Vision, decisions, priorities, review |
| **Builder** | AI Agent | Implementation, testing, debugging, iteration |

The human never writes code directly. Instead, they describe what they want, make decisions when asked, and review results. The AI agent writes all code, runs tests, fixes issues, and iterates until everything passes.

## The Iteration Loop

```
Human: "Let's add achievements"
  ↓
AI: proposes plan (game logic, DB, API, frontend)
  ↓
Human: "looks good, go"
  ↓
AI: implements → runs tests → fixes issues → verifies
  ↓
AI: "Done. 325 tests passing, 97.95% coverage. Commit message: ..."
  ↓
Human: commits and moves to next task
```

## What the AI Does

- **Reads specs** before implementing (`.kiro/specs/`, `.kiro/steering/`)
- **Proposes plans** for multi-step features
- **Writes minimal code** — only what's needed, no over-engineering
- **Runs the full verification pipeline**: `tsc --noEmit` → `biome check` → `npm test`
- **Fixes its own mistakes** — if tests fail, it debugs and retries
- **Suggests commit messages** following conventional commits

## What the Human Does

- **Sets direction**: "Let's do Phase 2" or "Add achievements"
- **Makes design decisions**: "No auto-assign — the hacker's skill should matter"
- **Chooses between options**: "Starlight or SvelteKit for docs?"
- **Reviews and commits**: The human controls git

## A Real Example: Phase 2

Phase 2 added 6 major features. Here's how the conversation went:

1. Human: "Let's start Phase 2"
2. AI reads the Phase 2 spec, proposes order: cities → hidden endpoints → coop → stage 4 → stage 5 → solution bots
3. Human approves
4. For each feature, AI implements, tests, and reports
5. Human commits after each feature
6. Total: ~6 hours of conversation, 14 new files, 5 DB migrations, all tests passing

## Key Principles

- **Specs as context**: The AI reads `.kiro/` docs at the start of each session
- **Minimal code**: Write only what's needed — the human explicitly asked for this
- **Test-driven confidence**: Every change is verified with the full test suite
- **Human decisions matter**: The AI proposes, the human decides
- **Italian for conversation, English for code**: The human's preference, respected throughout

## Results

| Metric | Value |
|--------|-------|
| Phases completed | 4 (MVP → Core → Depth → Polish) |
| Test count | 325 |
| Line coverage | 97.95% |
| Hacking stages | 5 |
| Cities | 4 (14 zones) |
| Achievements | 22 |
| Solution bots | 5 |
| DB migrations | 10 |

All built through conversation — zero lines of code written manually by the human.
