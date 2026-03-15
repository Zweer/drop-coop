# drop-coop — Game Design

> Detailed game mechanics, economy, progression, and hacking stages.

## Game Loop

```
Hire riders → Accept orders → Assign riders → Deliver → Get paid → Expand
     ↑                                                          |
     └──────────────────────────────────────────────────────────┘
```

### Core Loop (per game tick)
1. New orders arrive (based on time of day, zone demand, reputation)
2. Player assigns riders to orders (or bot does it via API)
3. Riders travel to pickup → pickup → travel to dropoff → deliver
4. Revenue added to treasury, rider gets XP
5. Costs deducted (salaries, maintenance)
6. Events may trigger

## Riders

### Stats

| Stat | Range | Effect |
|------|-------|--------|
| Speed | 1-10 | Delivery time |
| Reliability | 1-10 | Chance of successful delivery |
| City Knowledge | 1-10 | Route efficiency (shorter paths) |
| Stamina | 1-10 | Energy drain rate |

### Hiring
- Riders appear in a hiring pool (refreshes periodically)
- Each rider has a hiring cost and salary
- Better stats = higher cost
- Riders have personality traits that affect morale

### Energy
- Each delivery costs energy
- Energy regenerates over time (real time)
- Low energy = slower deliveries, higher failure rate
- Rest mechanic: bench a rider to recover faster

### Upgrades
- Better bike: +speed
- GPS device: +city knowledge
- Rain gear: no weather penalty
- Cargo rack: can carry 2 orders at once

### Morale
- Affected by: workload, pay, weather, events
- High morale: +reliability, +speed bonus
- Low morale: risk of quitting
- Cooperative decisions affect morale (voting on pay structure)

## Orders

### Generation
- Orders arrive based on:
  - Time of day (peak: lunch 12-14, dinner 19-21)
  - Zone demand (city center > suburbs)
  - Player reputation (more orders if high satisfaction)
  - Random events (festival = 3x orders)

### Properties

| Property | Description |
|----------|-------------|
| Pickup | Restaurant/store location |
| Dropoff | Customer location |
| Distance | Calculated from pickup to dropoff |
| Urgency | normal / urgent / express |
| Reward | Base + distance + urgency multiplier |
| Expiry | Time before order is lost |
| Weight | Affects rider speed |

### Assignment Algorithm (for bots)
The optimal assignment considers:
- Rider proximity to pickup
- Rider speed vs order urgency
- Rider current energy
- Route overlap with other orders (batching)

This is where the bot optimization challenge lives — there's no single "correct" algorithm.

## Economy

### Revenue
```
delivery_revenue = base_rate + (distance × per_km_rate) × urgency_multiplier
```

| Urgency | Multiplier |
|---------|-----------|
| Normal | 1.0x |
| Urgent | 1.5x |
| Express | 2.0x |

### Costs

| Cost | Frequency | Formula |
|------|-----------|---------|
| Rider salary | Per hour | base_salary × rider_level |
| Bike maintenance | Per delivery | distance × wear_rate |
| Zone fee | Monthly | zone_base_cost × zone_tier |
| Insurance | Monthly | rider_count × insurance_rate |

### Dynamic Pricing
- High demand → higher rewards
- Low supply (few riders) → higher rewards
- Competition (other co-ops in zone) → lower rewards
- Weather bonus (rain/snow = +50% reward)

## Zones & Cities

### Zone Properties
- Demand level (orders per hour)
- Traffic density (affects delivery time)
- Average distance (short in center, long in suburbs)
- Unlock cost

### Cities (expansion)
Each city is a set of zones with unique characteristics:

| City Archetype | Trait |
|---------------|-------|
| Dense Metro | Short distances, high traffic, many orders |
| Suburban | Long distances, low traffic, fewer orders |
| University Town | Peak at lunch/night, low on weekends |
| Tourist City | Seasonal demand, high tips |
| Industrial | Weekday-heavy, large orders |

## Events

### Random Events

| Event | Effect | Duration |
|-------|--------|----------|
| Rainstorm | -30% speed, +50% reward | 2-4 hours |
| Food Festival | +200% orders in zone | 1 day |
| Bike Lane Closure | -50% speed in zone | 3 days |
| Competitor Entry | -20% orders (they steal some) | Permanent until you outcompete |
| Rider Strike | Riders with low morale refuse to work | Until morale fixed |
| Viral Review | +100% orders for 24h | 1 day |
| Equipment Sale | -50% upgrade costs | 1 day |

### Decision Events
Some events require player choice:
- "A restaurant offers an exclusive contract. Accept? (guaranteed orders but lower rate)"
- "Riders demand a raise. Accept? (higher costs but +morale)"
- "New zone available at discount. Expand now?"

## Cooperative Mechanics

### Voting
Key decisions go to a vote among riders:
- Pay structure (equal split vs performance-based)
- Expansion decisions
- Working hours policy
- Equipment budget allocation

### Reputation
- Customer satisfaction → more/better orders
- Rider satisfaction → better retention, lower hiring costs
- Community reputation → unlock special contracts

## Progression

### Player Level
Based on total deliveries completed. Unlocks:
- Level 5: Second zone
- Level 10: Rider upgrades
- Level 20: New city
- Level 30: Cooperative voting
- Level 50: API tab appears in UI (hint to automate)
- Level 100: Secret contracts (API-only)

### Prestige (optional, late game)
Reset progress for permanent bonuses:
- +10% base revenue
- Start with better riders
- Unlock cosmetics

## Hacking Stage Details

### Stage 1 — "Plain Sight"
**Protection**: Session cookie only
**API**: Standard REST, JSON responses
**Discovery**: Open DevTools → Network tab → see all requests
**Challenge**: Write a script that calls `POST /api/orders/assign` automatically
**Hint in game**: "Pro tip: press F12 to see how the pros do it"

### Stage 2 — "Token Game"
**Protection**: JWT with 5-minute expiry
**New mechanic**: Hidden endpoint `/api/secret-shop` with better equipment
**Discovery**: JWT in Authorization header, decode to see expiry
**Challenge**: Handle token refresh, find the secret shop endpoint
**Hint in game**: "Some shops aren't on the map..."

### Stage 3 — "Signed & Sealed"
**Protection**: Every POST request needs `X-Signature: HMAC-SHA256(body, key)`
**Key location**: In frontend JS, variable named something misleading like `ANALYTICS_ID`
**Discovery**: Requests fail without signature → inspect frontend JS
**Challenge**: Find the key, implement signing in your bot

### Stage 4 — "Minified Madness"
**Protection**: Frontend fully minified, endpoint names are hashes
**Mapping**: `/api/a3f8b2` instead of `/api/orders`
**Discovery**: Deobfuscate the JS bundle, find the endpoint mapping
**Challenge**: Reconstruct the API from obfuscated code

### Stage 5 — "Rate & Wait"
**Protection**: 10 requests/minute limit
**Hidden feature**: `POST /api/batch` accepts array of actions in one request
**Anti-bot**: Requests at exact intervals (e.g., every 6.000s) → ban
**Challenge**: Find batch endpoint, add timing jitter

### Stage 6 — "Socket Dungeon"
**Protection**: Real-time features move to WebSocket
**Protocol**: JSON messages with sequence numbers and checksums
**Discovery**: WebSocket connection visible in DevTools
**Challenge**: Implement WS client with correct protocol

### Stage 7 — "Binary Protocol"
**Protection**: Market API uses Protocol Buffers instead of JSON
**Schema**: Not published — must be reverse-engineered from bytes
**Discovery**: Response Content-Type is `application/protobuf`
**Challenge**: Reconstruct the .proto schema from binary responses

### Stage 8 — "The Gauntlet"
**Protection**: All stages combined
**Special dungeon**: Unique mechanics requiring real-time WS + protobuf + signing
**Challenge**: Build a complete bot that handles everything
**Reward**: Special leaderboard entry, achievement badge

## Balance Philosophy

- **Early game should be fun manually** — don't make it tedious on purpose
- **Mid game should be challenging** — enough complexity that automation is tempting
- **Late game should reward automation** — features that are impractical without a bot
- **Never punish manual players** — they can still play, just less efficiently
- **Bots compete with bots** — separate leaderboard prevents unfairness

---

*Status: Core mechanics implemented (engine, economy, progression, zones, upgrades, failure, dynamic pricing, events). Cooperative mechanics pending.*
*Last updated: 2026-03-15*
