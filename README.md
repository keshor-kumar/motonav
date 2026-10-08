# MotoNav

A real group motorcycle riding app: real interactive map (MapTiler + MapLibre
GL JS), real GPS, real geocoding/search, real routing, real nearby places
(all via Geoapify) — and now **real group rides**: create a ride, get a
shareable link/QR, have friends join from their own phones, and see everyone
live on the same map via a real backend (Express + Socket.IO + PostgreSQL).

Voice is real push-to-talk (Stage 4); music remains a UI preview.

## Design system, landing page and app shell

**Look:** black / deep charcoal surfaces with racing red (`#E10600`) reserved for action, active state, the route line and alerts. Manrope (headings) + Inter (body) + JetBrains Mono (codes/numbers). Tokens live in `src/index.css`; icons are Lucide plus a custom motorcycle icon and brand mark (`src/components/common`). There are no emoji in the UI.

**Landing page** (`/`, `src/components/landing/*`): hero, group riding, turn-by-turn showcase, discover, ride conditions, safety/SOS, pre-ride warm-up, ride experience, final CTA. The photos are in `public/images/` (WebP). Scroll reveals use `IntersectionObserver` + CSS transforms only; the hero's slow drift is a CSS animation and is disabled under `prefers-reduced-motion`. Mockups on the page (group map, phone) are labelled *illustrative preview / sample values*. The only live data on the landing page is the **Check live conditions here** button (real Open-Meteo wind and weather, requested only when tapped).

**Dashboard** (`/dashboard`) is now a fixed, map-first app shell rather than a scrolling page: one full-screen MapLibre map (dark MapTiler style) with glass controls on top. On phones the Route / Crew / Nearby / More panels are a bottom sheet (tap or swipe the handle) above a four-icon dock; on desktop they are a floating left panel. Panels scroll internally; the landing, create and join pages are normal scrolling pages. Because it's an app shell, the map uses ordinary one-finger pan / wheel zoom.

**Navigation mode** (tap **Start**): full-screen map that tilts and follows your heading, a next-turn card at the top (maneuver icon, distance to the turn, road, a "then…" preview), and at the bottom speed, current road, remaining distance, time, ETA and progress. Distances/progress are measured along the route geometry from your live GPS. Turn data comes from Geoapify's route steps when the response includes them (`src/services/routingService.ts` parses them defensively); when it doesn't, the card says **Navigation ready** instead of inventing instructions. There is no automatic rerouting. If you leave the route, an **Off route -> Recalculate** prompt lets you reroute manually.

**Group ride UI:** Crew panel (ride name, destination, ride code, copy/share/QR, live rider list with riding/stopped/offline and real distance), tap a rider or their map marker for a detail card with **Navigate to rider**, separation toasts (threshold configurable in More).

**SOS** is hold-to-open (1.5 s) so it can't fire by accident. It offers **Call 112**, **Share my location** (Web Share / clipboard link) and **Nearby hospitals**. It does not contact emergency services or your crew by itself, and says so.

## Stage 4 — Rider Comms (push-to-talk, quick messages, rider signals)

During an active ride the **Comms** tab (and a floating mic button on the map) gives riders three things, all on the **existing** ride socket and ride room — no second realtime system, no new database tables.

**Push-to-talk (WebRTC).** Audio goes directly rider-to-rider over WebRTC; Socket.IO only carries signalling. Press and hold to talk, release to stop. The first press asks for microphone permission. States shown: enable voice, permission needed/denied, connecting, connected, transmitting, *<name> is speaking*, muted, reconnecting/disconnected. Controls: mic mute, speaker mute, leave voice, audio status (quality + per-rider link). It is a small full mesh (server cap: 8 riders in voice); the browser side lives in `src/services/voiceMesh.ts`, so it can be swapped for an SFU later without touching the UI. For each pair the rider with the lower id makes the offer, so offers never collide. A stuck button is auto-released by the server after 45 s, and voice pauses when the app is backgrounded.

**Quick ride messages.** Eight one-tap messages (stopping, fuel, break, hazard, slow down, wait for me, meet here, emergency). Riders get a compact auto-dismissing banner (hazard and emergency rank higher, emergencies stay longer and vibrate on phones that support it); a "Show" button centres the map on the sender's last position. The sender's name and position come from the server's records, never from the client. Messages are real-time only and are not stored.

**Rider signals.** A full-screen, swipeable guide (17 common signals in 6 categories, original SVG illustrations) opened from the Comms tab or More. It is labelled *Common Rider Signals*: meanings vary by country, riding school and group, and where no standard signal exists (emergencies) the card says so instead of inventing one. Study it off the bike.

**Rider list.** Each rider shows their voice state (connected / speaking / muted / connecting / reconnecting) next to their riding status.

### Server events (same socket, same ride room)

Client to server: `voice:join` (ack), `voice:leave`, `voice:state {muted}`, `ptt:start`, `ptt:stop`, `rtc:offer` (ack), `rtc:answer` (ack), `rtc:ice`, `comms:message {kind}` (ack).
Server to client: `voice:roster {peers}`, `voice:peer-reset`, `rtc:offer|answer|ice {from,…}`, `ptt:timeout`, `comms:message`, `comms:error`.
HTTP: `GET /api/comms/ice` (authenticated) returns the ICE servers.

### Security

The ride and rider for every comms event come from the verified socket (session token + database membership), never from the payload. Signalling can only be relayed to a voice participant of the **sender's own ride** (rooms are keyed by the server-derived ride id). Offers/answers/ICE/messages are validated and size-bounded; quick messages use a whitelist and a per-rider rate limit; voice presence is cleared on disconnect, leave and end-ride. Nothing is recorded; no audio ever touches the server or database. All of this logic is in `server/src/comms.ts` and is covered by `server/test/comms.test.ts`.

### Configuration: STUN / TURN

Voice works with the default public STUN server for most riders. Riders on strict mobile-carrier networks (symmetric NAT) can only connect through a **TURN relay**. To add one, set these **server-side** variables on your backend (Render) — they are optional and never reach the frontend bundle:

```
STUN_URLS=            # optional, comma-separated; defaults to Google's public STUN
TURN_URLS=            # e.g. turn:turn.example.com:3478,turns:turn.example.com:5349
TURN_USERNAME=
TURN_CREDENTIAL=
```

Without TURN, a small share of rider pairs may stay on "connecting". Voice also requires HTTPS (Vercel provides it) and microphone permission. No frontend environment variables changed.

## Stage 5 — Moto News, Famous Rides, Moto Community

Three additive modules; ride rooms, comms and navigation are untouched.

### Moto News — `/news`
`GET /api/news/motorcycle?category=&refresh=1` on the backend calls NewsAPI.org with `NEWS_API_KEY` (server-only, sent in the `X-Api-Key` header) and returns normalized `{title, description, image, publishedAt, source, url, category}`. Categories are assigned by a keyword classifier (Latest, India, New Bikes, Adventure/Touring, MotoGP/Racing, EV, Safety, Technology). 15-minute cache, 60 s floor between forced refreshes, stale data served if the provider fails, concurrent requests de-duplicated. Cards show a snippet and "Read Article" opens the publisher's page; nothing is copied. No key set → `503 not_configured` and a friendly page state.

### Famous Rides — `/routes`, `/routes/:id`
Ten curated routes (`src/data/famousRoutes.ts`). Cards show an SVG trace of the real waypoints (no tile/WebGL cost), stats and a bookmark (localStorage). The detail page uses the existing MapTiler map and the existing `getRoute()` (Geoapify) for a live line, falling back to the curated waypoints. **Start This Route** navigates to `/dashboard` with the route's start/destination, which the existing dashboard turns into a normal route + navigation. Distances/times are approximate planning figures.

### Moto Community — `/community`, `/community/:code`
Text chat, voice messages and a shareable link. No accounts: creating or joining returns a community token (JWT, `typ:"community"`, signed with the existing `JWT_SECRET`); it cannot be used as a ride token or vice-versa. Rider names are unique per community (case-insensitive). The link, Copy, Share and QR all use `VITE_PUBLIC_APP_URL`.

**Voice:** hold the mic to record, release to send, slide left to cancel; a quick tap locks hands-free recording with Send/Cancel. The browser uploads raw bytes to the backend (never to Supabase directly), the backend validates (auth first, 2 MB cap, MIME allow-list, magic-byte check, 0.7–60 s), stores the file in the **private** bucket, saves the storage *path* in Postgres and broadcasts only metadata + a 1 h signed URL. The database stores only the object path, so a voice message stays playable forever: when a URL is old or fails, the app calls `GET /:code/messages/:id/audio-url` and the backend mints a fresh one.

#### New REST endpoints (`/api/community`)
| Method | Path | Auth |
|---|---|---|
| POST | `/` create `{name, description?, riderName}` | none (rate-limited) |
| GET | `/:code` public info | none |
| POST | `/:code/join` `{riderName}` | none (rate-limited) |
| GET | `/:code/session` | community token |
| GET | `/:code/messages?before=&limit=` | member |
| POST | `/:code/messages` `{text}` | member |
| GET | `/:code/messages/:id/audio-url` fresh playable URL (member only, community-scoped) | member |
| POST | `/:code/audio` raw body, `Content-Type`, `X-Audio-Duration-Ms` | member |
| GET | `/audio/:cid/:file` dev-only memory storage | none |
| GET | `/api/news/motorcycle` | none |

#### New Socket.IO events (namespace `/community`, room `community:<id>`)
Client→server: `community:join` (ack), `community:leave`, `community:message {text}` (ack), `community:typing`. Server→client: `community:message`, `community:audio-message`, `community:member-joined`, `community:typing`. Audio is sent over HTTP then broadcast; there is no audio-over-socket event from the client. Membership is verified server-side from the token on connect and on every event. Rate limits: text 12 / 10 s, audio 6 / min per member. Ride sockets live on the default namespace and are unaffected.

#### Database migration
Run `npm run server:migrate` — it applies every file in `server/migrations/`, including **`002_community.sql`** (tables `communities`, `community_members`, `community_messages`, indexes, RLS enabled with no policies). It is idempotent and does not touch ride tables. You can also paste the file into the Supabase SQL editor.

#### Supabase Storage setup
1. Supabase dashboard → Storage → **New bucket** → name `community-audio`, **Public: OFF**.
2. Optional: set a file size limit of 2 MB and allowed types `audio/webm, audio/ogg, audio/mp4, audio/mpeg, audio/wav`.
3. On the backend (Render) set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_AUDIO_BUCKET=community-audio`. The service-role key stays **server-side only** — never a `VITE_` variable.
Without these the backend falls back to in-memory audio (lost on restart, single instance) so local dev works with zero setup.

#### New environment variables
Backend only: `NEWS_API_KEY`, `NEWS_API_BASE_URL` (optional), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_AUDIO_BUCKET`. **No new frontend variables.** Existing names are unchanged.

#### Local testing
```
npm install && npm run server:install
npm run server:migrate      # only if DATABASE_URL is set
npm run dev:full            # frontend :5173 + backend :4000
```
Open `/community`, create a community, then open the link in a second browser profile/phone to join. Microphone needs HTTPS or `localhost`. `cd server && npm test` runs the backend suite (56 tests).

#### Deployment
Redeploy the Render backend (new env vars + run the migration), create the storage bucket, redeploy the Vercel frontend. No `vercel.json` change is needed (the SPA rewrite already covers `/community/*`, `/routes/*`, `/news`).

### Stage 5 limitations
- Verified here: backend unit/integration tests (56), strict `tsc` for both halves against stub typings, and a Chromium (Playwright) run of the real React app against a harness that runs the project's real service/stores behind a hand-rolled HTTP/`ws` stand-in for Express/Socket.IO. **Not verified here:** `npm install`/`npm run build`, the real Express/Socket.IO/pg glue, Supabase Storage, the real NewsAPI, a real phone (iOS Safari especially), a real microphone (a fake media stream was used), the on-screen keyboard (emulated by resizing the viewport).
- Famous Rides cover images are reused bundled photos, not route-specific; replace them in `public/images/`.
- Each signed audio URL lasts 1 h, but the message stays playable: the app fetches a fresh URL on demand (tested against a forced-expired URL in the harness; not yet against real Supabase).
- NewsAPI.org's developer plan is for development use and rate-limited; use a paid plan for production.
- Community names can't be reclaimed: a rider who clears browser storage must join under a new name.
- Start This Route uses the route's start city as the origin; use "my location" in the dashboard to route from where you are.

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
- **The new UI has not been rendered in a real browser by me.** I verified it with a strict `tsc` check against stubbed external types (0 errors), an esbuild bundle of the whole app, and a parse of every stylesheet, but I couldn't run `npm install`, `vite` or a browser in this environment. Please check the landing page and dashboard at 375 / 390 / 412 px and on desktop.
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
- **Turn-by-turn depends on the routing response.** Geoapify's step schema was parsed defensively but is not verified against a live response from here; if a route has no usable steps the navigation card shows "Navigation ready". Geoapify also has no motorcycle profile (the general "drive" profile is used), and there is no automatic rerouting.
- **Images are low resolution** (640-736 px wide portraits). They look fine under the dark overlays on phones, but full-bleed on a large desktop screen they are visibly upscaled. For a sharp desktop hero, replace the files in `public/images/` (same names) with 2000-2400 px wide versions. Also confirm you hold the licence/usage rights for these photos before deploying publicly.

## Structure

```
motonav/
  src/
    components/   app (dashboard shell), landing, common, layout, map, navigation (+ guidance), ride, nearby, overlay, warmup, voice, music
    pages/        LandingPage, DashboardPage, CreateRidePage, JoinRidePage (+ /join/:code)
    services/     geocodingService, routingService, placesService, locationService,
                  mapService, groupRideService (REST), socketService (Socket.IO client)
    hooks/        useGeolocation, useRouteNavigation, useNearbyPlaces,
                  useSeparationAlerts, useMusicPlayer, useVoiceChannel
    context/      GroupRideContext (real group-ride session: REST + Socket.IO + GPS broadcast)
    types/        shared domain types (GroupRide, GroupMember, RiderView, etc.)
    utils/        geo (haversine/bearing), presence (riding/stopped/offline), format
    config/       env.ts — centralized API key / URL access, never hardcoded elsewhere
  server/
    src/          types, validation, rideCode, store (interface), memoryStore, pgStore,
                   service (business logic), auth (JWT), hub, http (REST), socket
                   (Socket.IO), comms (voice signalling/PTT/quick messages), config, index (entrypoint), migrate
    community/     Stage 5: types, validation, stores, auth, storage, service, routes, socket
    news.ts        Stage 5: NewsAPI proxy + classifier
    migrations/    001_init.sql, 002_community.sql
    test/          service.test.ts + comms.test.ts (29 tests, run with `npm test`)
```

## Not implemented yet (by design)

Accounts/auth beyond per-ride session tokens, music
streaming/sync, SOS/push notifications, hydration/exercise/weather features,
circular ride generation, offline/Bluetooth communication.
