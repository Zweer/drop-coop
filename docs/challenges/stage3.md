# Stage 3 — Data Edge

> "Knowledge is profit."

## The Challenge

Your bot assigns orders and handles HMAC signing. But are you making the *best* decisions?

There are analytics endpoints that give you forecasts, efficiency data, and hiring previews. The data isn't perfect — but a bot that uses it will outperform one that doesn't.

## What's New

All endpoints are HMAC-protected (same key as Stage 2).

### `GET /api/analytics/demand?hours=4`
Order forecast per zone. Shows expected order count and average reward range.

```json
{
  "hours": 4,
  "forecasts": [
    { "zone": "centro", "name": "Centro", "expectedOrders": [8, 14], "avgReward": [4.5, 7.2], "demandLevel": 8 }
  ]
}
```

### `GET /api/analytics/events?hours=6`
Event probability forecast. Not if, but how likely.

```json
{
  "hours": 6,
  "anyEventProbability": 0.42,
  "predictions": [
    { "type": "rainstorm", "name": "Rainstorm", "emoji": "🌧️", "probability": 0.15, "withinHours": 6 }
  ]
}
```

### `GET /api/analytics/riders`
Historical efficiency per rider — success rate and best zone.

```json
{
  "stats": [
    { "riderId": "...", "name": "Marco", "deliveries": 47, "successRate": 0.92, "bestZoneId": "..." }
  ]
}
```

### `GET /api/analytics/pool`
Preview of the next hiring pool. 3 of 4 riders shown, one stat is off by ±1.

```json
{
  "hints": [
    { "name": "Giulia", "speed": 6, "reliability": 7, "cityKnowledge": 4, "stamina": 5, "estimatedCost": [45, 55] }
  ],
  "hiddenCount": 1,
  "refreshAt": "2026-03-16T04:00:00.000Z"
}
```

## What You'll Learn

- Using imperfect data to make better decisions
- Demand forecasting and resource allocation
- Data-driven optimization vs gut feeling

## Your Goal

Build a bot that:
1. Checks demand forecasts to decide where to focus riders
2. Uses event predictions to time upgrades (wait for equipment sales)
3. Assigns riders to zones where they perform best
4. Decides whether to hire now or wait for a better pool

The leaderboard doesn't lie. Better data = better decisions = more profit. 📊
