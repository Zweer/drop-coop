# Stage 5 — Rate & Wait

> "Slow down. Or better yet, be smarter about it."

## The Challenge

The API now detects bot-like behavior. If your requests arrive at perfectly regular intervals, you'll get blocked. And the normal rate limit (60 req/min) isn't enough for a serious bot.

You need two things: **timing jitter** and the **pipeline endpoint**.

## What's New

### Timing Detection

The server tracks your request intervals. If the last 6 requests have near-identical timing (standard deviation < 100ms), you get a `429`:

```json
{ "error": "Too regular. Add some randomness." }
```

**Fix**: Add random jitter to your request timing. Instead of `setInterval(fn, 1000)`, use `setTimeout(fn, 1000 + Math.random() * 500)`.

### The Pipeline

There's a hidden endpoint that accepts multiple action types in a single request:

```
POST /api/pipeline
```

HMAC-protected (same key as Stage 2). Accepts up to 50 actions per request:

```json
{
  "actions": [
    { "type": "assign", "riderId": "...", "orderId": "..." },
    { "type": "upgrade", "riderId": "...", "stat": "speed" },
    { "type": "rest", "riderId": "..." },
    { "type": "hire", "poolId": "..." }
  ]
}
```

Response:

```json
{
  "results": [
    { "index": 0, "type": "assign", "ok": true, "data": { "orderId": "...", "estimatedMinutes": 12 } },
    { "index": 1, "type": "upgrade", "ok": true, "data": { "stat": "speed", "newValue": 6, "cost": 150 } }
  ],
  "summary": { "total": 4, "succeeded": 3, "failed": 1 }
}
```

## The Advantage

- **50 actions per request** — one pipeline call replaces 50 individual API calls
- Combined with the obfuscated endpoints (Stage 4), you can run a high-throughput bot
- Actions are processed sequentially — money/state updates carry through

## What You'll Learn

- Timing jitter and anti-detection techniques
- Batch processing and request optimization
- Combining multiple API features for maximum efficiency

## Your Goal

1. Add random jitter to all your bot's request timing
2. Find and use the pipeline endpoint
3. Batch your operations: check orders → assign riders → upgrade → hire, all in one call
4. Maximize throughput while staying under the radar 🕐
