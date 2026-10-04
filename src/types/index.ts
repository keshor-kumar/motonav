// ============================================================
// Core domain types for MotoNav — Stage 1 (UI only, mock data)
// Kept close to what a real backend would return so Stage 2+
// can swap mock services for real API calls without changing
// component props.
// ============================================================

export type ConnectionStatus = "connected" | "connecting" | "offline";

export interface RiderLocation {
  lat: number;
  lng: number;
}

export interface Rider {
  id: string;
  name: string;
  avatarColor: string;
  initials: string;
  isLeader: boolean;
  status: ConnectionStatus;
  distanceFromGroupKm: number; // + ahead, - behind
  speedKph: number;
  location: RiderLocation;
  isSpeaking?: boolean;
  isMuted?: boolean;
}

export type PlaceCategory =
  | "fuel"
  | "food"
  | "hotel"
  | "restroom"
  | "coffee"
  | "mechanic"
  | "hospital"
  | "parking"
  | "shop";

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  distanceKm: number;
  etaMin: number;
  rating: number;
  address: string;
  openNow: boolean;
  priceLevel?: 1 | 2 | 3;
  tags: string[];
}

export interface RouteInfo {
  originName: string;
  destinationName: string;
  distanceKm: number;
  durationMin: number;
  etaLabel: string;
  trafficLevel: "light" | "moderate" | "heavy";
  nextTurn: string;
  nextTurnDistanceM: number;
}

export interface RideInfo {
  id: string;
  name: string;
  leaderName: string;
  startLocation: string;
  destination: string;
  date: string;
  memberCount: number;
  inviteLink: string;
  status: "not-started" | "active" | "completed";
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSec: number;
  artColor: string;
}

export interface MusicState {
  currentTrack: Track;
  queue: Track[];
  isPlaying: boolean;
  progressSec: number;
  volume: number;
  isGroupSynced: boolean;
  syncedListenerCount: number;
}

export type AppView = "landing" | "dashboard" | "create-ride" | "join-ride";

export type DashboardTab = "home" | "map" | "ride" | "nearby" | "more";

// ============================================================
// Stage 2 — real navigation types (MapTiler + Geoapify).
// These back the real map/GPS/geocoding/routing/places services
// and intentionally stay separate from the few Stage 1 mock types
// still in place for features this stage explicitly keeps mocked
// (group riders, voice, music). The nearby-places mock (old `Place`
// above + data/places.ts) is superseded by `NearbyPlace` + the real
// Geoapify Places integration — `Place` is left in the codebase
// unused rather than deleted, per the "don't remove things
// unnecessarily" rule, but nothing still imports it.
// ============================================================

/** A raw lat/lng pair. The only shape services accept/return for positions. */
export interface Coordinates {
  lat: number;
  lng: number;
}

/** A named point with resolved coordinates — either geocoded or from GPS. */
export interface NavLocation {
  label: string;
  coords: Coordinates;
  source: "gps" | "search" | "ride";
}

/** One geocoding/place search result (Geoapify) the user can pick from. */
export interface SearchResult {
  id: string;
  label: string;
  address?: string;
  coords: Coordinates;
}

/** Raw route data returned by the routing service (Geoapify Routing API).
 *  Deliberately lightweight — distance, duration, and the route line only.
 *  No turn-by-turn step data; that was removed to keep routing fast and simple. */
export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  /** [lat, lng] pairs in path order. Converted to MapLibre's [lng, lat] only at the map boundary. */
  geometry: [number, number][];
}

/** Route data paired with the origin/destination labels it was computed for. */
export interface RouteSummary {
  origin: NavLocation;
  destination: NavLocation;
  route: RouteResult;
}

export type GeoPermissionState = "idle" | "requesting" | "granted" | "denied" | "unavailable";

export interface GeoErrorInfo {
  kind: "permission-denied" | "unavailable" | "timeout" | "unknown";
  message: string;
}

/** A real nearby place from the Geoapify Places API. */
export interface NearbyPlace {
  id: string;
  name: string;
  category: PlaceCategory;
  address: string;
  distanceMeters: number;
  coords: Coordinates;
}

// ============================================================
// Stage 3 — real group rides, backed by the MotoNav server
// (REST + Socket.IO). These mirror the backend's types closely
// (see server/src/types.ts) — kept as separate frontend types
// rather than a shared package so the two can evolve slightly
// differently (e.g. Coordinates here vs separate lat/lng fields
// over the wire) without coupling client and server builds.
// ============================================================

export type MemberConnection = "connected" | "disconnected";
/** Derived client-side from connection + speed + lastUpdated — the server only tracks connected/disconnected. */
export type RiderPresence = "riding" | "stopped" | "offline";

/** A real, server-stored ride. Destination coordinates are resolved and
 *  stored once at creation time, so every member routes to the exact same point. */
export interface GroupRide {
  id: string;
  rideCode: string;
  rideName: string;
  destination: string;
  destinationLatitude: number;
  destinationLongitude: number;
  status: "active" | "ended";
  createdBy: string;
  createdAt: string;
  endedAt: string | null;
}

export interface GroupMember {
  riderId: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  heading: number | null;
  speed: number | null;
  lastUpdated: string; // ISO
  connectionStatus: MemberConnection;
  isCreator: boolean;
}

/** Shown on the join page before the rider has joined — never includes coordinates. */
export interface PublicRideInfo {
  rideCode: string;
  rideName: string;
  destination: string;
  status: "active" | "ended";
  memberCount: number;
}

/** Persisted to localStorage so a refresh (or returning from WhatsApp) keeps the rider in their ride. */
export interface GroupSession {
  token: string;
  rideCode: string;
  riderId: string;
  riderName: string;
}

/** A member enriched for display: live presence + real distance from MY current GPS position. */
export interface RiderView {
  member: GroupMember;
  isMe: boolean;
  presence: RiderPresence;
  distanceMeters: number | null;
}
