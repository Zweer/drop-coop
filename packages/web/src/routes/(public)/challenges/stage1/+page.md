# Stage 1 — Plain Sight

> "Every click you make, the API makes too."

## The Challenge

Your co-op is growing. You're clicking "Assign" dozens of times a day. But what if you didn't have to?

Everything the game does goes through a real REST API. Open your browser's DevTools (F12 → Network tab) and watch what happens when you assign an order.

## What You'll Learn

- How to inspect HTTP requests with DevTools
- How JWT authentication works
- How to make API calls with `curl` or your favorite language
- How to handle token refresh (tokens expire every 5 minutes)

## Getting Started

1. Open DevTools → Network tab
2. Click "Assign" on an order
3. Look at the request — you'll see the URL, method, headers, and body
4. Try reproducing it with `curl`

## Hints

- The `Authorization` header contains a JWT — decode it at [jwt.io](https://jwt.io)
- Tokens expire after 5 minutes — check `POST /api/auth/refresh`
- `GET /api/orders/available` shows orders you can assign
- `GET /api/riders` shows your riders and their status

## Your Goal

Write a script that:
1. Logs in and gets a token
2. Fetches available orders and idle riders
3. Assigns riders to orders automatically
4. Handles token refresh when it expires

Your bot plays while you sleep. 🤖
