# Interaction Patterns

## Interview Before Implementing

For ambiguous or complex requests, ask clarifying questions BEFORE writing code:
- What's the expected behavior?
- Are there edge cases to consider?
- Does this affect existing features?
- What's the priority (quick fix vs proper solution)?

Skip the interview for clear, well-defined tasks.

## Plan Mode

For multi-step tasks (new features, refactors, architecture changes):
1. Write a short numbered plan first
2. Wait for approval before implementing
3. Adapt the plan if requirements change mid-execution

Skip planning for single-file fixes, small bug fixes, or simple questions.

## ASCII Diagrams

Use ASCII diagrams when discussing:
- Architecture decisions
- Data flow between packages (api ↔ game ↔ web)
- New feature design involving multiple components
- Database schema relationships

## Context Hygiene

- Keep each steering/spec file under ~200 lines
- Split files when they grow beyond that
- One concern per file (don't mix code style with testing rules)
- Update specs when features are completed or changed
