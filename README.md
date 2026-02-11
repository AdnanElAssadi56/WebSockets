# ⚡ WebSocket Broadcast System

A real-time sports match commentary broadcast system built with **Express**, **WebSockets (`ws`)**, **PostgreSQL** (via **Neon**), and **Drizzle ORM**. Clients subscribe to live matches and receive commentary events pushed in real time over WebSocket connections.

---

## Architecture

```
┌──────────────┐         ┌──────────────────────────────────┐
│  REST Client │────────▶│  Express HTTP Server (port 8000) │
│  (Postman,   │◀────────│                                  │
│   curl, etc) │         │  POST /matches ─┐                │
└──────────────┘         │  POST /matches/:id ──┐           │
                         │                      │           │
                         │   broadcastMatchCreated()        │
                         │   broadcastCommentary()          │
                         └──────────┬───────────────────────┘
                                    │  Shared HTTP server
                         ┌──────────▼───────────────────────┐
                         │  WebSocket Server (/ws)          │
                         │                                  │
                         │  subscribe { matchId: 1 }        │
                         │  ◀──── commentary pushed ────▶   │
                         └──────────┬───────────────────────┘
                                    │
                         ┌──────────▼───────────────────────┐
                         │  PostgreSQL (Neon)                │
                         │  • matches table                 │
                         │  • commentary table              │
                         └──────────────────────────────────┘
```

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime |
| **Express 5** | HTTP server & REST API |
| **ws** | WebSocket server (RFC 6455) |
| **Drizzle ORM** | Type-safe SQL query builder & migrations |
| **PostgreSQL (Neon)** | Serverless Postgres database |
| **Zod** | Request validation schemas |
| **dotenv** | Environment variable management |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- A **PostgreSQL** database (e.g., [Neon](https://neon.tech))

### Installation

```bash
# Clone the repository
git clone https://github.com/AdnanElAssadi56/WebSockets.git
cd WebSockets

# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL='postgresql://user:password@host/dbname?sslmode=require'
PORT=8000
HOST=0.0.0.0
```

### Database Setup

```bash
# Generate migration files from the schema
npm run db:generate

# Apply migrations to the database
npm run db:migrate
```

### Run the Server

```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

The server starts at `http://localhost:8000` with the WebSocket endpoint at `ws://localhost:8000/ws`.

---

## REST API Reference

### Matches

#### `GET /matches`

List all matches, ordered by most recently created.

| Query Param | Type | Default | Description |
|-------------|------|---------|-------------|
| `limit` | number | 50 | Max results (1–100) |

**Response** `200 OK`
```json
{
  "events": [
    {
      "id": 1,
      "sport": "football",
      "homeTeam": "Team A",
      "awayTeam": "Team B",
      "status": "live",
      "startTime": "2026-02-10T20:00:00.000Z",
      "endTime": "2026-02-10T22:00:00.000Z",
      "homeScore": 2,
      "awayScore": 1,
      "createdAt": "2026-02-10T19:00:00.000Z"
    }
  ]
}
```

#### `POST /matches`

Create a new match. Automatically computes `status` (scheduled / live / finished) based on the current time relative to `startTime` and `endTime`. Broadcasts a `match_created` event to **all** connected WebSocket clients.

**Request Body**
```json
{
  "sport": "football",
  "homeTeam": "Team A",
  "awayTeam": "Team B",
  "startTime": "2026-02-10T20:00:00Z",
  "endTime": "2026-02-10T22:00:00Z",
  "homeScore": 0,
  "awayScore": 0
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `sport` | string | ✅ | |
| `homeTeam` | string | ✅ | |
| `awayTeam` | string | ✅ | |
| `startTime` | ISO 8601 | ✅ | Must be before `endTime` |
| `endTime` | ISO 8601 | ✅ | Must be after `startTime` |
| `homeScore` | number | ❌ | Defaults to 0 |
| `awayScore` | number | ❌ | Defaults to 0 |

**Response** `201 Created`

---

### Commentary

#### `GET /matches/:id`

List all commentary entries for a specific match.

| Query Param | Type | Default | Description |
|-------------|------|---------|-------------|
| `limit` | number | 50 | Max results (1–100) |

**Response** `200 OK`
```json
{
  "matchId": 1,
  "count": 2,
  "commentary": [
    {
      "id": 1,
      "matchId": 1,
      "minute": 23,
      "sequence": 1,
      "period": "first_half",
      "eventType": "goal",
      "actor": "Player X",
      "team": "Team A",
      "message": "GOAL! Player X scores from close range!",
      "metadata": { "assistedBy": "Player Y" },
      "tags": ["goal", "highlight"],
      "createdAt": "2026-02-10T20:23:00.000Z"
    }
  ]
}
```

#### `POST /matches/:id`

Create a new commentary entry for a match. Broadcasts the commentary to all WebSocket clients **subscribed to that specific match**.

**Request Body**
```json
{
  "minute": 23,
  "sequence": 1,
  "period": "first_half",
  "eventType": "goal",
  "actor": "Player X",
  "team": "Team A",
  "message": "GOAL! Player X scores from close range!",
  "metadata": { "assistedBy": "Player Y" },
  "tags": ["goal", "highlight"]
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `minute` | number | ✅ | Non-negative integer |
| `sequence` | number | ✅ | Non-negative integer |
| `period` | string | ✅ | e.g., `"first_half"`, `"second_half"` |
| `eventType` | string | ✅ | e.g., `"goal"`, `"foul"`, `"substitution"` |
| `actor` | string | ✅ | Player or entity name |
| `team` | string | ✅ | Team name |
| `message` | string | ✅ | Human-readable commentary text |
| `metadata` | object | ❌ | Arbitrary key-value data |
| `tags` | string[] | ❌ | Searchable tags |

**Response** `201 Created`

---

## WebSocket Protocol

Connect to `ws://localhost:8000/ws`.

### Connection Flow

1. **Connect** → Server sends a `welcome` message
2. **Subscribe** to matches by ID → Receive real-time commentary
3. **Heartbeat** — server pings every 30s; unresponsive clients are terminated

### Client → Server Messages

#### Subscribe to a match
```json
{ "type": "subscribe", "matchId": 1 }
```
**Response:** `{ "type": "subscribed", "matchId": 1 }`

#### Unsubscribe from a match
```json
{ "type": "unsubscribe", "matchId": 1 }
```
**Response:** `{ "type": "unsubscribed", "matchId": 1 }`

### Server → Client Messages

| Type | Trigger | Audience |
|------|---------|----------|
| `welcome` | On connection | Connecting client only |
| `match_created` | `POST /matches` | All connected clients |
| `commentary` | `POST /matches/:id` | Clients subscribed to that match |
| `error` | Invalid message | Sending client only |

#### Example: Commentary push
```json
{
  "type": "commentary",
  "data": {
    "id": 5,
    "matchId": 1,
    "minute": 45,
    "eventType": "goal",
    "message": "GOAL! Equalizer at the stroke of half-time!",
    ...
  }
}
```

---

## Project Structure

```
WebSockets/
├── src/
│   ├── index.js                  # Express + HTTP server + WS bootstrap
│   ├── db/
│   │   ├── db.js                 # PostgreSQL pool & Drizzle instance
│   │   └── schema.js             # Drizzle table definitions (matches, commentary)
│   ├── routes/
│   │   ├── matches.js            # GET/POST /matches
│   │   └── commentary.js         # GET/POST /matches/:id (commentary)
│   ├── validation/
│   │   ├── matches.js            # Zod schemas for match input
│   │   └── commentary.js         # Zod schemas for commentary input
│   ├── utils/
│   │   └── match-status.js       # Derives status from time window
│   └── ws/
│       └── server.js             # WebSocket server, pub/sub, heartbeat
├── drizzle/
│   └── 0000_yellow_slapstick.sql # Generated migration
├── drizzle.config.js             # Drizzle Kit configuration
├── package.json
├── .env                          # Environment variables (not committed)
└── .gitignore
```

---

## Key Design Decisions

- **Pub/Sub per match** — Clients subscribe to specific match IDs, so commentary is only pushed to interested listeners rather than all connections.
- **Heartbeat mechanism** — A 30-second ping/pong cycle detects and terminates stale connections, preventing resource leaks.
- **Automatic subscription cleanup** — When a client disconnects, all of its subscriptions are removed from the in-memory map.
- **Time-based status derivation** — Match status (`scheduled` → `live` → `finished`) is computed from `startTime`/`endTime` at creation time rather than requiring manual status updates.
- **Zod validation** — All incoming data (params, query strings, request bodies) is validated with Zod schemas before touching the database.
- **Cascading deletes** — Deleting a match automatically removes all its commentary entries via the foreign key constraint.

---

## Future Enhancements

- `PATCH /matches/:id/score` — Update match scores in real time (validation schema already defined)
- Periodic match status sync — Automatically transition matches from `scheduled` → `live` → `finished` based on time (utility stub exists)
- Match filtering — Filter `GET /matches` by status, sport, or date range
- Authentication & authorization
- Rate limiting for WebSocket messages
- Redis-backed pub/sub for horizontal scaling across multiple server instances
