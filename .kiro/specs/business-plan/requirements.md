# drop-coop — Business Plan

> Mini business plan for growth and sustainability.

## The Product

A tycoon/simulation browser game where you manage a delivery rider cooperative. Playable by clicking in the browser, but with real API endpoints that hackers can reverse-engineer and automate. Hosted on Vercel (free tier).

## Target Audience

### Primary: Incremental/Idle Game Players
- r/incremental_games (150k+ subscribers)
- r/tycoon (100k+ subscribers)
- r/webgames (200k+ subscribers)
- Always looking for new games, will try anything free

### Secondary: Developer/Hacker Community
- People who enjoy reverse engineering, API hacking, bot building
- CTF players looking for something different
- Fans of Bitburner, Screeps, Hacknet
- r/netsec, r/ReverseEngineering, Hacker News

### Tertiary: Italian Audience
- The "gig economy cooperative" theme resonates culturally
- Italian dev community (potential early adopters)

## Unique Selling Points

1. **No game like this exists** — tycoon + API hacking is a new genre
2. **Two games in one** — casual tycoon for clickers, hacking sandbox for devs
3. **Zero setup** — play instantly in the browser, hosted on Vercel
4. **Open source** — community can contribute stages, cities, events
5. **Educational** — teaches real security concepts through gameplay

## Monetization Strategy

| Phase | Model | Revenue |
|-------|-------|---------|
| **MVP** | Free, open source | $0 (build community) |
| **v1.0** | Donations (Ko-fi, GitHub Sponsors) | $0-50/month |
| **v1.5** | Cosmetics (UI themes, rider skins) | $50-200/month |
| **v2.0** | Premium on Steam/itch.io ($3-5) | $200-500/month |
| **Stretch** | Mobile PWA | Additional market |

**Realistic expectation**: This is a side project. Revenue is a bonus, not the goal. Primary value is portfolio, learning, and fun.

## Growth Strategy

### Phase 0 — MVP (2-3 weekends)
**Goal**: Validate the concept

- Core game loop: hire riders, accept orders, deliver, get paid
- Minimal UI (functional, not pretty)
- Stage 1 only (plain REST API)
- Deploy to Vercel (free tier)
- Publish on itch.io (free)
- Post on r/incremental_games: "I built a delivery tycoon where you can hack the API"

**Success metric**: 100+ players try it, positive feedback on the concept

### Phase 1 — Validation (month 1-2)
**Goal**: Prove people want both layers

- Incorporate community feedback
- Add depth: weather, events, multiple zones
- Stages 2-3 (JWT, HMAC)
- Challenge descriptions with hints
- Post on r/tycoon, r/webgames

**Success metric**: 20%+ retention (players return after 1 week)

### Phase 2 — Content (month 3-4)
**Goal**: Enough content for sustained play

- Multiple cities with different characteristics
- Cooperative mechanics (voting)
- Stages 4-5 (obfuscation, rate limiting)
- Achievements / milestones
- Ko-fi / GitHub Sponsors active

**Success metric**: Active community discussions, first donations

### Phase 3 — Polish (month 5-6)
**Goal**: Ready for wider audience

- Improved UI (still simple, but polished)
- Tutorial / onboarding
- Stages 6-8 (WebSocket, protobuf, gauntlet)
- Localization (EN + IT)
- Publish on Steam / itch.io ($3-5)

**Success metric**: 500+ Steam wishlists, $100+/month revenue

### Phase 4 — Expansion (month 6+)
**Goal**: Sustainable community

- Mobile PWA
- Mod support (community cities/events/stages)
- Seasonal leaderboard resets
- Community-submitted hacking stages
- Documentation site

**Success metric**: Self-sustaining community, regular contributions

## Marketing Channels

| Channel | Type | When |
|---------|------|------|
| r/incremental_games | Launch post | MVP |
| r/tycoon | Cross-post | Phase 1 |
| r/webgames | Cross-post | Phase 1 |
| Hacker News | "Show HN" | Phase 2 (when stages are interesting) |
| r/netsec | Hacking angle | Phase 2 |
| dev.to | Article: "I built a game you're supposed to hack" | Phase 1 |
| X/Twitter | GIF/video demos | Ongoing |
| itch.io | Game page | MVP |
| Steam | Store page | Phase 3 |

## Costs

| Item | Cost | When |
|------|------|------|
| Domain (dropcoop.io or similar) | ~€30/year | Phase 1 |
| Steam fee | $100 one-time | Phase 3 |
| Hosting (if needed) | $0 (GitHub Pages / Vercel) | — |
| Time | 5-10 hours/week | Ongoing |

**Total upfront cost**: ~€30 (domain only). Steam fee only if we get there.

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Don't finish it | High | MVP in 2 weekends. Publish immediately. Feedback motivates |
| Nobody plays | Medium | Post on Reddit (free). If no traction, pivot or stop — only 2 weekends lost |
| Game balance is bad | High | Release early, iterate on feedback. No tycoon is balanced at v1 |
| Hacking stages too easy | Medium | Start simple, add harder stages based on community feedback |
| Someone builds it first | Low | Niche concept. Execution > idea |
| AI solves all stages | Medium | Stages 1-4 are educational (OK if AI helps). Stages 5-8 require real-time interaction |

## Competitive Landscape

| Game | Similarity | Difference |
|------|-----------|------------|
| OWASP Juice Shop | Hacking challenges | Not a real game, no tycoon layer |
| Bitburner | Programmable game | Single player, no reverse engineering |
| Screeps | Bot-based MMO | Requires always-on server, complex |
| CodinGame | Competitive programming | No game layer, pure algorithms |
| Cookie Clicker | Idle game | No hacking layer |
| Delivery tycoons | Tycoon genre | No API/hacking layer |

**Nobody combines tycoon + API hacking.** This is the gap.

## Exit Strategy (if it doesn't work)

Even if the game fails, you have:
- A complete TypeScript full-stack project in portfolio
- Game design experience
- An article: "What I learned building a hackable browser game"
- Reusable code (API framework, game engine, auth system)
- Fun building it

## Key Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Genre | Idle Tycoon | Best effort/result ratio for solo dev |
| Theme | Delivery cooperative | Unique, culturally relevant, rich mechanics |
| Hacking approach | Progressive disclosure | Not forced, natural part of scaling |
| Hosting | Vercel (free tier) | Zero config, auto-deploy, serverless |
| Monetization | Free → donations → premium | Low friction, build community first |
| Frontend framework | Svelte 5 + SvelteKit | Compiler-driven, minimal boilerplate, great DX |
| UI Components | shadcn-svelte | Accessible, copy-paste, Tailwind CSS |
| Backend framework | Hono | Lightweight, TypeScript-native, zero-config on Vercel |
| Runtime | Node.js 22 (LTS) | Stable, battle-tested |
| Database | PostgreSQL (Neon) | Serverless, scale-to-zero, free tier |
| ORM | Drizzle | Type-safe, SQL-first, native Neon support |

---

*Status: Plan complete*
*Decision date: 2026-03-14*
*Estimated effort to MVP: 2-3 weekends*
