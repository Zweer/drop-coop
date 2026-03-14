# Code Style & Best Practices

## TypeScript

### Strict Mode
- Always use strict mode (enabled in `tsconfig.json`)
- No `any` types — use `unknown` or proper types
- Explicit return types on all exported functions
- Explicit parameter types always

### Module System
- ES modules only (`"type": "module"` in package.json)
- Use `.js` extensions in imports
- Example: `import { foo } from './bar.js'` (not `./bar` or `./bar.ts`)

### Naming Conventions
- **camelCase** for variables, functions, methods
- **PascalCase** for classes, interfaces, types
- **UPPER_SNAKE_CASE** for constants
- **kebab-case** for file names

### Code Organization
```typescript
// 1. Imports (external first, then internal)
import { Hono } from 'hono';
import type { GameState } from './types.js';

// 2. Types/Interfaces
export interface RiderConfig {
  name: string;
  speed: number;
}

// 3. Constants
const DEFAULT_ENERGY = 100;

// 4. Classes/Functions
export class GameEngine {
  // ...
}
```

## Code Quality

### Linting & Formatting
- **Biome** for linting and formatting (NOT ESLint/Prettier)
- Single quotes for strings
- 100 character line width
- No semicolons

### Error Handling
- Always throw typed errors with clear messages
- Include context in error messages
- Use `try/catch` for async operations

### Async/Await
- Prefer `async/await` over `.then()/.catch()`
- Use `Promise.all()` for parallel operations

## Dependencies

### Minimal Dependencies
- Only add dependencies when absolutely necessary
- Prefer native Node.js APIs when possible
- Use native `fetch` — no axios or similar

### Key Dependencies (planned)
- `hono` — HTTP framework (lightweight, fast)
- `drizzle-orm` + `@neondatabase/serverless` — ORM + Postgres driver
- `jose` — JWT creation and verification
- `arctic` — OAuth 2.0 flows (GitHub, Google) — Phase 1
- `zod` — Input validation

## Security

### Game Security
- All game logic runs server-side (never trust the client)
- Rate limiting on all endpoints
- Input validation with Zod on every route
- SQL parameterized queries (no string concatenation)

### Hacking Stages
- Each stage adds a real security layer
- The "vulnerabilities" are intentional and educational
- Document what each stage teaches

## Comments & Documentation

### When to Comment
- Complex game mechanics or formulas
- API endpoint documentation (JSDoc)
- Hacking stage explanations
- Non-obvious balance decisions

### JSDoc
Use JSDoc for public APIs:
```typescript
/**
 * Assign a rider to an order based on proximity and availability.
 *
 * @param riderId - The rider to assign
 * @param orderId - The order to fulfill
 * @returns Assignment result with estimated delivery time
 */
export function assignRider(riderId: string, orderId: string): AssignmentResult {
  // ...
}
```
