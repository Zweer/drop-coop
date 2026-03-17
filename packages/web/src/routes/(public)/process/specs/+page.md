---
title: Requirements & Specs
---

# 📋 Requirements & Specs

drop-coop started with a clear set of specifications before any code was written. All specs live in `.kiro/specs/` and serve as the source of truth throughout development.

## Three Spec Documents

### 1. Core Requirements (`v1/requirements.md`)

The main spec defines:
- **Project identity** — name, tagline, genre, platform, license
- **Two audiences** — casual players (click to play) and hackers (reverse-engineer the API)
- **Functional requirements** — riders, orders, economy, zones, events, cooperative mechanics
- **API surface** — every endpoint the game exposes
- **Hacking stages** — 8 progressive security layers (5 implemented)
- **Implementation phases** — MVP → Core → Depth → Polish → Community
- **Non-functional requirements** — serverless, fast, responsive, free tier

### 2. Game Design (`game-design/requirements.md`)

Deep dive into game mechanics:
- **Core loop**: Hire → Accept → Assign → Deliver → Get paid → Expand
- **Rider stats**: Speed, reliability, city knowledge, stamina (1-10 scale)
- **Economy formulas**: Revenue = base + distance × rate × urgency multiplier
- **Zone archetypes**: Dense metro, suburban, university town, tourist city, industrial
- **Event system**: Rainstorms, festivals, strikes, viral reviews
- **Cooperative voting**: Pay structure, work hours, equipment budget
- **Progression**: Level-based unlocks, milestones, prestige (future)
- **Hacking stage details**: What each stage teaches, what's new, what skills are needed

### 3. Business Plan (`business-plan/requirements.md`)

Even a side project benefits from a plan:
- **Target audience**: r/incremental_games, r/tycoon, dev/hacker community
- **Growth strategy**: Reddit posts → community feedback → iterate
- **Monetization**: Free → donations → premium ($3-5 on Steam)
- **Competitive landscape**: No game combines tycoon + API hacking
- **Risk mitigation**: MVP in 2 weekends, publish immediately, iterate on feedback

## How Specs Drive Development

Each phase has a checklist in the requirements. The AI agent references these specs before implementing any feature, ensuring alignment with the original vision.

When the human says "let's do Phase 2", the agent reads the spec, proposes a plan, and implements each item — checking off the list as features are completed.

The specs are **living documents** — updated after each phase with completion status and dates.
