# MotoNav

A real group motorcycle riding app: real interactive map (MapTiler + MapLibre
GL JS), real GPS, real geocoding/search, real routing, real nearby places
(all via Geoapify) — and now **real group rides**: create a ride, get a
shareable link/QR, have friends join from their own phones, and see everyone
live on the same map via a real backend (Express + Socket.IO + PostgreSQL).

Voice and music remain UI mocks (explicitly out of scope for this stage).

## Premium UI + rider-intelligence features

The whole app now uses a black + racing-red design (deep near-black
surfaces, red accents reserved for active/primary/alert states — not
everything is red). This was a token-value remap (`src/index.css`), not a
component rewrite, since every component already styled itself through CSS
custom properties.

The map area also has an icon-first overlay instead of permanent text
cards: a compact wind strip at the top (real Open-Meteo data for your
current GPS position, with headwind/tailwind/crosswind relative to your
heading), and a row of tap-to-open icons below the map — **Terrain, Roads,
Curves, Weather, Fuel, Alerts, Warm-up, Riders**. Tapping one opens a
bottom sheet; tapping outside or the X returns to a clean map.

- **Curves** is computed from the *actual* route geometry (real bearing
  changes between route points) — not a guess.
- **Terrain** and **Roads** honestly show "Information unavailable" rather
  than inventing road-type/elevation data, since no real data source for
  that is wired up yet.
- **Fuel** reuses the real Geoapify nearby-places search.
- **Warm-up** opens a full-screen pre-ride stretch routine — 6 exercises,
  custom SVG illustrations, a timer, prev/next/skip, and a safety
  disclaimer.

## Architecture

```
Phone 1 ─┐
Phone 2 ─┤
Phone 3 ─┼── HTTPS (REST) + WSS (Socket.IO) ── Backend (Express + Socket.IO) ── PostgreSQL
Phone 4 ─┘        ↑
                   └── Frontend (React/Vite), hosted separately, static
```

**Frontend** — React 18 + TypeScript + Vite, deployed as a static site
(Vercel). Talks to Geoapify/MapTiler directly from the browser (public APIs
gated by your own API keys), and to the MotoNav backend over REST + a
Socket.IO WebSocket connection for everything ride-related.

### No Wi-Fi/LAN dependency — how that's actually enforced

Phones never talk to each other directly and never need to be on the same
network. Every connection — frontend↔backend REST, frontend↔backend
Socket.IO — goes through `VITE_API_BASE_URL`/`VITE_SOCKET_URL`
(`src/config/env.ts`), which is the **only** place those URLs come from.
Nothing constructs a URL from `window.location.hostname` or any device IP.

This isn't just a convention — it's checked:
- Grepping the entire project for `192.168.`, `10.x.x.x`, `172.16-31.x.x`,
  and `127.0.0.1` returns zero matches, anywhere.
- The only `localhost` references are (a) explicitly gated behind
  `import.meta.env.DEV` (Vite's build-time flag — `false` in any production
  build, no exceptions) and (b) the backend's local-dev-only CORS fallback,
  which is **unreachable in production**: `loadConfig()` throws at boot if
  `NODE_ENV=production` and neither `CLIENT_ORIGINS` nor `FRONTEND_URL` is
  set, so a production deployment can never silently fall back to it.

Changing Wi-Fi networks has no effect on either value — they're read once
from environment variables at build time (frontend) or process start
(backend), never derived from the network you're currently on.

**Backend** (`server/`) — Node.js + Express + Socket.IO, deployed as a
long-running process (Vercel's serverless functions can't hold a WebSocket
open, which is why this is a separate deployment target — Render/Railway/Fly
all work). It's the **sole source of truth** for rides and members: ride
codes are generated and stored server-side, every location update is
validated there, and every rider's current position lives in the database,
never only in browser state.

**Database** — PostgreSQL (Supabase or any managed Postgres). Three tables:
`riders`, `rides`, `ride_members` — see `server/migrations/001_init.sql`.
Only each member's *latest* position is stored (no location history table),
and coordinates are wiped (set to `NULL`) the moment a rider leaves or a ride
ends — there's no lingering location data for anyone no longer in an active
ride.

**Realtime** — Socket.IO. Every rider in a ride joins the same server-side
room (`ride:<rideId>`); location updates and member-state changes broadcast
to that room only. A JWT (signed server-side, `JWT_SECRET`) proves which
rider/ride a socket belongs to — the server independently re-checks DB
membership on every connection and location update, never trusting a client
claim alone.

## Frontend setup

```bash
cd motonav
cp .env.example .env   # fill in your keys (see below)
npm install
npm run dev
```

Opens at `http://localhost:5173` by default.

### Frontend environment variables

| Variable | Required | Notes |
|---|---|---|
| `VITE_GEOAPIFY_API_KEY` | For search/routing/nearby | Free key at geoapify.com |
| `VITE_MAPTILER_API_KEY` | For the real map style | Free key at maptiler.com — without it, the map falls back to MapLibre's free demo style |
| `VITE_API_BASE_URL` | For group rides | Backend URL. Blank defaults to `http://localhost:4000` **in dev only** — set explicitly in production |
| `VITE_PUBLIC_APP_URL` | For correct share links | Falls back to the browser's current origin if blank — set explicitly in production so `/join/<code>` links are never wrong |

Missing keys never crash the app — each feature shows a clear "not
configured" message instead (see `hasGeoapifyKey`/`hasMapTilerKey`/
`hasApiBaseUrl` in `src/config/env.ts`).

## Backend setup

```bash
cd motonav/server
cp .env.example .env   # fill in DATABASE_URL and JWT_SECRET
npm install
npm run migrate        # applies server/migrations/*.sql
npm run dev            # starts on :4000 by default
```

### Backend environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | In production | Postgres connection string. Without it, the server **falls back to an in-memory store** — fine for a quick local demo with no setup, but data is lost on restart. Always set this in production. |
| `JWT_SECRET` | In production | Long random string signing rider session tokens. Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Without it in dev, a random one is generated at boot (logged as a warning) — fine locally, but sessions reset every restart. |
| `CLIENT_ORIGINS` | Yes (or `FRONTEND_URL`) | Comma-separated list of frontend origins allowed to call this API (CORS + Socket.IO). E.g. `https://motonav.vercel.app,http://localhost:5173` |
| `FRONTEND_URL` | Alternative to `CLIENT_ORIGINS` | Single-origin equivalent, accepted under either name since deployment dashboards vary on which they expect |
| `PORT` | No | Render/Railway/Fly set this automatically |

## Database setup

Using Supabase: create a project, then **Project Settings → Database →
Connection string (URI)** → that's your `DATABASE_URL`. Run `npm run migrate`
from `server/` once it's set — this applies `server/migrations/001_init.sql`,
which is idempotent (`CREATE TABLE IF NOT EXISTS`), safe to re-run.

**Schema** (full detail in the migration file):
- `riders` — `id`, `name`, `created_at`
- `rides` — `id`, `ride_code` (unique, 6 chars), `ride_name`, `destination`,
  `destination_latitude`/`longitude`, `created_by`, `status`
  (`active`/`ended`), `created_at`, `ended_at`
- `ride_members` — `(ride_id, user_id)` composite primary key, `name`,
  `latitude`/`longitude`/`heading`/`speed` (all nullable — null while
  offline/left), `last_updated`, `connection_status`
  (`connected`/`disconnected`/`left`), `joined_at`

## Local development (both halves at once)

**This project has two separate `package.json` files — one here, one in
`server/`.** Running `npm install` in the root only installs the frontend;
the backend needs its own install. This trips people up, so there's now a
combined command:

```bash
npm install                 # frontend deps (prints a reminder about the backend)
npm run server:install      # backend deps
npm run server:migrate      # creates the database tables (needs server/.env set up first)
npm run dev:full            # runs frontend (Vite) AND backend together, labeled output
npm run dev:all              # identical alias — both names work
```

Or run them separately in two terminals if you'd rather see each one's
output on its own:
```bash
# terminal 1
npm run server:install && npm run server:migrate && npm run server

# terminal 2
npm run dev
```
With `VITE_API_BASE_URL` left blank, the frontend talks to
`http://localhost:4000` automatically in dev. **Create Ride will show
"Network error reaching the MotoNav server" if the backend isn't running** —
that's not a bug, it just means `npm run server` (or `npm run dev:full`)
hasn't been started yet.

## Production deployment

I can't click through any of these dashboards myself — no GitHub/Vercel/
Render/Supabase account access from this environment. Here's exactly what to
do, and I haven't verified a live deployment exists; please confirm each
step actually works as you go.

### 1. Database — Supabase
1. Create a project at supabase.com.
2. **Project Settings → Database → Connection string (URI)** → copy it. This
   is your backend's `DATABASE_URL`.

### 2. Backend — Render (or Railway/Fly)
1. Push this repo to GitHub (see below) if you haven't already.
2. On render.com: **New → Web Service** → connect the GitHub repo.
3. **Root Directory**: `server`
4. **Build Command**: `npm install && npm run build`
5. **Start Command**: `npm run migrate:prod && node dist/index.js`
   (runs the migration once per deploy, then starts the server — safe to
   repeat since migrations are idempotent)
6. Environment variables: `DATABASE_URL` (from Supabase), `JWT_SECRET`
   (generate one — see above), `CLIENT_ORIGINS` (your Vercel URL — you'll
   add this after step 3, so deploy once, then come back and set it),
   `NODE_ENV=production`.
7. Deploy. Render gives you a URL like `https://motonav-api.onrender.com`
   — this is your backend's public URL.

### 3. Frontend — Vercel
1. On vercel.com: **Add New… → Project** → import the same GitHub repo.
2. Vercel auto-detects Vite. Confirm **Build Command** `npm run build`,
   **Output Directory** `dist`, **Root Directory** the repo root (not
   `server`).
3. Environment variables (Production + Preview + Development):
   - `VITE_MAPTILER_API_KEY`, `VITE_GEOAPIFY_API_KEY` — your real keys
   - `VITE_API_BASE_URL` = the Render URL from step 2 (e.g.
     `https://motonav-api.onrender.com`)
   - `VITE_PUBLIC_APP_URL` = this Vercel URL once you know it (you may need
     to deploy once, see the assigned URL, then set this and redeploy)
4. Deploy. Vercel gives you a URL like `https://motonav-xxxxx.vercel.app`.
5. Go back to Render and set `CLIENT_ORIGINS` to that exact Vercel URL, then
   redeploy the backend so CORS/Socket.IO accept requests from it.

### GitHub
```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```
`.gitignore` already excludes `.env`, `.env.*` (except `.env.example`),
`node_modules`, and `dist` for both the root project and `server/` — verify
with `git status` before your first push that no `.env` file is staged.

## How to create a ride

Landing page → **Create Ride** → fill in Ride Name, Your Name, Destination
→ submit. The frontend geocodes the destination (Geoapify) to real
coordinates, then calls the backend, which generates a unique 6-character
ride code (unambiguous alphabet — no `0/O/1/I/L`), stores the ride, and
creates you as its first member. You'll see the ride code, the public join
link, and Copy/Share/QR options.

## How to share a ride

On the "ride created" screen (or from the Group Riders panel once you're in
the ride): **Copy link** copies `https://<your-domain>/join/<CODE>` to the
clipboard; **Share** uses the Web Share API where the browser supports it
(falls back to copy); **Show QR** renders a QR code of that same URL (via a
public, keyless QR-image endpoint — no QR library dependency needed).

## How another rider joins

They open the link (or scan the QR) → lands on `/join/<CODE>` → the app
looks up the ride (name + destination shown, no coordinates exposed before
joining) → they enter their name → **Join ride**. The backend validates the
code (case-insensitive, whitespace-trimmed — `mn7k42`, `MN7K42`, and
` MN7K42 ` all resolve identically), rejects a name already in use, creates
their membership, and returns a session token. The app then connects a
Socket.IO connection authenticated with that token and joins the shared
`ride:<rideId>` room.

## How realtime tracking works

Once in a ride, the browser's `watchPosition` runs continuously (started by
`GroupRideContext`). Updates are throttled before ever reaching the network:
sent when the rider has moved **≥15m** or **≥4s** have passed since the last
send, with a 15s heartbeat so a stationary rider's "last updated" timestamp
still stays fresh for everyone else. Each update carries latitude,
longitude, heading, and speed; the server validates it, stores it as that
rider's *only* current position (no history kept), and broadcasts it to
everyone else in the room. Every other connected phone receives it and
updates that rider's motorcycle marker position/rotation and the computed
distance-from-me — no polling anywhere.

### Reconnection (Wi-Fi changes, dropped signal, backgrounded tab)

The Socket.IO client (`src/services/socketService.ts`) is configured with
`reconnection: true`, infinite attempts, and an exponential-ish backoff
(1s → up to 8s between tries) — it keeps trying on its own. A visible
**"Server: Connected / Disconnected"** indicator (shown whenever you're in
an active ride — `ConnectionStatusBanner`) plus a **Retry connection**
button give you a way to force an immediate attempt instead of waiting on
the timer. Rider identity survives this automatically: the same session
token is reused for every reconnect attempt, the server re-authorizes it
against the same rider/ride, and a newer connection for the same rider
explicitly replaces (never duplicates) any stale one — switching from home
Wi-Fi to mobile data mid-ride does not create a second "you." GPS watching
itself never stops during a disconnect (it's tied to having an active
session, not to socket connectivity), so location resumes broadcasting the
moment the socket reconnects.

## How to test with two phones

1. Deploy both frontend and backend (see above) — this needs two independent
   devices on two independent connections to mean anything; testing both in
   the same browser on one laptop won't exercise the realtime path honestly.
2. **Phone A**: open the public URL → Create Ride → note the code/link.
3. **Phone A**: tap "Use my current location", allow permission.
4. **Phone B**: open the share link (or scan the QR) → enter a name → Join.
5. **Phone B**: allow location permission.
6. On **both** phones: confirm you see the other rider's name, a distinct
   motorcycle marker, a live distance that updates, and a presence indicator
   (🟢 riding / 🟡 stopped / 🔴 offline).
7. Physically move one phone (or just drive) — confirm the other phone's
   marker and distance update within a few seconds.
8. Test **Leave ride** on one phone — confirm the other phone shows them
   removed from the active list.
9. Test **End ride** (as the creator) — confirm the other phone is notified
   and a fresh `/join/<code>` attempt is rejected with "This ride has ended."

**I have not run this test myself** — no second device, no deployed
instance reachable from this environment. This is the most important thing
for you to verify before trusting the realtime path.

## Known limitations

- **Wind/weather (Open-Meteo)**: free, no API key, but no SLA — fine for
  this stage; worth adding caching/a paid tier before heavy public traffic.
  Refetches only every 2km moved or 5 minutes, whichever comes first.
- **Terrain and Roads panels are honest placeholders** — they say
  "Information unavailable" rather than guessing, because no real
  road-class/elevation data source is wired up. Curves is real (computed
  from route geometry); Terrain/Roads are not yet backed by anything.
- **Icon toolbar not visually tested on a real device** — I fixed one
  concrete layout risk I found on inspection (an 8-icon grid that would
  have overlapped the "My Location" button on a short mobile map; it's now
  a horizontally-scrollable strip below the map instead of overlaid on it),
  but I have no way to render this in an actual browser from here. Please
  check it at 375/390/412px before trusting it.

- **Not deployed by me.** Every deployment step above is unexecuted and
  unverified from this environment — I wrote the configuration and
  instructions, but have not confirmed a live URL exists, that Render's
  build actually succeeds, or that Supabase connectivity works end to end.
- **No `npm install`/`npm run build` run here** — this sandbox has no
  network access to the npm registry. I ran `tsc --noEmit` (frontend) and
  both `tsc` and the backend's real test suite (`tsx --test`, 12/12 passing)
  directly in this environment as the closest verification available; a
  real `npm install` + `npm run build` on your machine is still the
  authoritative check.
- **Separation-alert threshold is a fixed 2km default**, not yet
  user-configurable via UI (the spec asked for configurable 500m/1km/2km
  options — the mechanism supports any threshold, just not exposed as a
  setting yet).
- **In-memory store fallback**: if `DATABASE_URL` is unset, the backend runs
  on a non-persistent in-memory store. Fine for a quick demo; never use this
  in production, and it won't survive a server restart or work correctly
  across multiple server instances.
- **Geoapify routing profile**: no dedicated motorcycle profile exists on
  Geoapify; using the general "drive" profile (isolated to one constant in
  `src/services/routingService.ts` for an easy future swap).
- **Navigation mode stays "lightweight"** by earlier explicit request: no
  turn-by-turn instructions, no off-route detection/auto-reroute. The route
  calculated when navigation starts is shown as-is.
- **The old Stage 1 mock ride system** (`src/services/rideService.ts`,
  `src/context/RideContext.tsx`) is now unused dead code — nothing imports
  it anymore, since Create/Join Ride both go through the real backend. Left
  in place rather than deleted, per this project's "don't remove things
  unnecessarily" convention; safe to delete in a later cleanup pass.
- **Group voice** gets a UI placeholder only (existing mock "Push to Talk"
  panel) — no WebRTC, as explicitly requested.

## Structure

```
motonav/
  src/
    components/   common, layout, map, navigation, ride, riders, nearby, voice, music
    pages/        LandingPage, DashboardPage, CreateRidePage, JoinRidePage (+ /join/:code)
    services/     geocodingService, routingService, placesService, locationService,
                  mapService, groupRideService (REST), socketService (Socket.IO client)
    hooks/        useGeolocation, useRouteNavigation, useNearbyPlaces,
                  useSeparationAlerts, useMusicPlayer, useVoiceChannel
    context/      RideContext (legacy mock fallback), GroupRideContext (real Stage 3 session)
    types/        shared domain types (GroupRide, GroupMember, RiderView, etc.)
    utils/        geo (haversine/bearing), presence (riding/stopped/offline), format
    config/       env.ts — centralized API key / URL access, never hardcoded elsewhere
  server/
    src/          types, validation, rideCode, store (interface), memoryStore, pgStore,
                   service (business logic), auth (JWT), hub, http (REST), socket
                   (Socket.IO), config, index (entrypoint), migrate
    migrations/    001_init.sql
    test/          service.test.ts (12 tests, run with `npm test`)
```

## Not implemented yet (by design)

Accounts/auth beyond per-ride session tokens, group voice (WebRTC), music
streaming/sync, SOS/push notifications, hydration/exercise/weather features,
circular ride generation, offline/Bluetooth communication.
