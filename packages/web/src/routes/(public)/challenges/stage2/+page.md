# Stage 2 — Signed & Sealed

> "One request at a time? That's cute."

## The Challenge

Your bot works, but it's slow. Assigning 20 orders means 20 API calls. What if you could do it in one?

There are **bulk endpoints** that let you assign multiple orders or upgrade multiple riders in a single request. But they're protected — you need to sign your requests.

## What's New

- `POST /api/batch/assign` — assign up to 20 orders in one call
- `POST /api/batch/upgrade` — upgrade multiple rider stats in one call
- Both require an `X-Signature` header: HMAC-SHA256 of the request body

## What You'll Learn

- How HMAC request signing works
- How to find secrets in frontend JavaScript
- How to use bulk operations for efficiency

## Getting Started

1. Try calling `POST /api/batch/assign` without a signature — you'll get a 401
2. The frontend already signs these requests. Look at the JavaScript bundle.
3. Find the signing key and implement it in your bot

## Hints

- The signature is `HMAC-SHA256(request_body, key)` as a hex string
- The key is in the frontend JavaScript — look for variables that seem out of place
- The `X-Signature` header must contain the hex-encoded signature

## Bulk Assign Format

```json
{
  "assignments": [
    { "riderId": "uuid-1", "orderId": "uuid-a" },
    { "riderId": "uuid-2", "orderId": "uuid-b" }
  ]
}
```

## Bulk Upgrade Format

```json
{
  "upgrades": [
    { "riderId": "uuid-1", "stat": "speed" },
    { "riderId": "uuid-1", "stat": "reliability" }
  ]
}
```

## Your Goal

1. Find the HMAC key in the frontend code
2. Implement request signing in your bot
3. Use bulk assign to dispatch all orders in one call
4. Use bulk upgrade to level up riders efficiently

Less latency, more throughput, bigger profits. 📈
