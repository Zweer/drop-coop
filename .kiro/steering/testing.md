# Testing Strategy

## Test Framework

### Vitest
- All tests use **Vitest**
- Run tests: `npm test`
- Coverage: `npm run test:coverage`

## Test Types

### Unit Tests — Game Logic
- Test game engine functions in isolation
- Pure functions: input → output, no side effects
- Economy formulas, rider assignment, order generation

```typescript
describe('Economy', () => {
  it('should calculate delivery revenue based on distance', () => {
    const revenue = calculateRevenue({ distance: 5, urgency: 'normal' })
    expect(revenue).toBe(12.5)
  })
})
```

### Integration Tests — API Endpoints
- Test API routes with a real SQLite in-memory database
- Verify request/response format
- Test authentication and authorization

```typescript
describe('POST /api/orders/assign', () => {
  it('should assign rider to order', async () => {
    const res = await app.request('/api/orders/assign', {
      method: 'POST',
      body: JSON.stringify({ riderId: '1', orderId: '2' }),
    })
    expect(res.status).toBe(200)
  })
})
```

### Hacking Stage Tests
- Each stage has tests verifying the protection works
- Tests that the "intended bypass" also works
- Ensures stages don't break normal gameplay

### E2E Tests
- Full game flow: register → hire rider → accept order → deliver → get paid
- Bot simulation: automated play through API

## Mocking

### When to Mock
- Time-dependent operations (use `vi.useFakeTimers()`)
- Random number generation (seed for deterministic tests)

### When NOT to Mock
- SQLite (use in-memory database instead)
- Game logic (test the real implementation)
- API routes (test with real Hono app instance)

## Test Data

### Deterministic
- Fixed seeds for random generation
- Fixed timestamps
- Predictable game states

### Fixtures
```typescript
const mockRider = {
  id: 'rider-1',
  name: 'Test Rider',
  speed: 5,
  reliability: 8,
  cityKnowledge: 3,
}

const mockOrder = {
  id: 'order-1',
  pickup: { lat: 45.464, lng: 9.190 },
  dropoff: { lat: 45.470, lng: 9.195 },
  urgency: 'normal' as const,
}
```
