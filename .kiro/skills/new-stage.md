# Adding a New Hacking Stage

## 1. Create the stage middleware

```
server/src/stages/stageN.ts
```

Each stage is a Hono middleware that wraps API routes with a protection layer.

```typescript
import { createMiddleware } from 'hono/factory'

export const stageN = createMiddleware(async (c, next) => {
  // Verify the protection (e.g., check signature, validate token)
  // If invalid → return 401/403
  // If valid → call next()
  await next()
})
```

## 2. Create the challenge description

```
challenges/stageN.md
```

Include:
- Stage name and theme
- What the player needs to figure out
- Hints (progressive, from vague to specific)
- Skills learned
- Difficulty rating

## 3. Create the official solution

```
solutions/stageN/bot.ts
```

A working bot that bypasses the stage's protection. This serves as:
- Proof that the stage is solvable
- Reference implementation for testing
- Spoiler for players who are stuck

## 4. Add tests

```
server/test/stages/stageN.test.ts
```

Test that:
- Protected endpoints reject invalid requests
- Protected endpoints accept valid requests (the intended bypass)
- Normal gameplay still works through the frontend
- The official solution bot works

## 5. Update stage selection

In `server/src/index.ts`, add the stage to the stage selector:

```typescript
const stages = {
  1: stage1,
  2: stage2,
  // ...
  N: stageN,
}
```

## 6. Update documentation

- Add stage to README.md stage list
- Add stage to the challenges index

## Checklist

- [ ] Stage middleware created
- [ ] Challenge description written
- [ ] Official solution bot works
- [ ] Tests pass
- [ ] Stage selector updated
- [ ] Documentation updated
