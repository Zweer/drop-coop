---
title: Requirements & Specs
---

# 📋 Requirements & Specs

## The idea

Before any code was written, we wrote down exactly what we wanted to build. Not a vague idea — a structured document covering the game, the hacking layer, the business model, and the technical architecture.

This matters because the AI agent reads these specs at the start of every session. They're the "shared understanding" between human and machine. Without them, the AI would guess. With them, it builds exactly what was designed.

## Three documents, three perspectives

We created three specification documents, each serving a different purpose:

### 1. Core Requirements — *What are we building?*

The main spec defines the product: a delivery tycoon game with a hidden API hacking layer. It covers:

- **Two audiences** — casual players who click to play, and hackers who reverse-engineer the API
- **Game features** — riders, orders, economy, zones, events, cooperative mechanics
- **Hacking stages** — 8 progressive security challenges (5 implemented so far)
- **Implementation phases** — a roadmap from MVP to community features
- **Non-functional requirements** — serverless, fast, free to host

### 2. Game Design — *How does the game work?*

A deep dive into mechanics: the core loop (hire → assign → deliver → earn → expand), rider stats, economy formulas, zone types, event system, cooperative voting. This document ensures the game is fun and balanced, not just technically functional.

### 3. Business Plan — *Why build this?*

Even a side project benefits from a plan. Target audience (Reddit gaming communities, developer/hacker community), growth strategy (post on Reddit, iterate on feedback), monetization path (free → donations → premium). The key insight: **no game combines tycoon + API hacking**. That's the gap.

## Why specs matter for AI-assisted development

Traditional development: specs are written, then developers interpret them (sometimes loosely).

AI-assisted development: specs are the **contract**. The AI reads them literally. If the spec says "8 hacking stages", the AI will build 8 stages. If it says "HMAC-SHA256 with key in frontend JS", that's exactly what gets implemented.

This makes specs more important, not less. Ambiguity in specs = ambiguity in code.

## Living documents

The specs aren't frozen. After each phase, they're updated with completion status and dates. When a decision changes (e.g., "defer WebSocket stages until infra supports it"), the spec is updated and the AI adapts.

---

## Technical Details

All specs live in `.kiro/specs/` — a convention for AI-readable project context:

```
.kiro/
├── specs/
│   ├── v1/requirements.md          # Core requirements
│   ├── game-design/requirements.md # Game mechanics
│   └── business-plan/requirements.md # Business plan
└── steering/
    ├── code-style.md               # Coding conventions
    ├── testing.md                  # Testing strategy
    ├── architecture.md             # System diagrams
    └── interaction.md              # How human ↔ AI communicate
```

The `steering/` directory contains guidelines for *how* to build (code style, testing rules, architecture patterns). The `specs/` directory contains *what* to build.

When the human says "let's do Phase 2", the AI reads the Phase 2 checklist from `v1/requirements.md`, proposes a plan, and implements each item — checking off the list as features are completed.
