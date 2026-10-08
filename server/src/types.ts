export type RideStatus = "active" | "ended";
export type MemberConnection = "connected" | "disconnected" | "left";

export interface Ride {
  id: string;
  rideCode: string;
  rideName: string;
  destination: string;
  destinationLatitude: number;
  destinationLongitude: number;
  createdBy: string;
  createdAt: string; // ISO
  status: RideStatus;
  endedAt: string | null;
}

export interface Member {
  rideId: string;
  userId: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  heading: number | null;
  speed: number | null;
  lastUpdated: string; // ISO
  connectionStatus: MemberConnection;
  joinedAt: string; // ISO
}

/** What clients are allowed to see about a member. */
export interface PublicMember {
  riderId: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  heading: number | null;
  speed: number | null;
  lastUpdated: string;
  connectionStatus: Exclude<MemberConnection, "left">;
  isCreator: boolean;
}

/** Public ride info — no coordinates of any rider, safe to show on the join page. */
export interface PublicRideInfo {
  rideCode: string;
  rideName: string;
  destination: string;
  status: RideStatus;
  memberCount: number;
}

export interface RideDetails {
  id: string;
  rideCode: string;
  rideName: string;
  destination: string;
  destinationLatitude: number;
  destinationLongitude: number;
  status: RideStatus;
  createdBy: string;
  createdAt: string;
  endedAt: string | null;
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
}

export interface SessionClaims {
  riderId: string;
  rideId: string;
  rideCode: string;
}

export interface Auth {
  sign(claims: SessionClaims): string;
  verify(token: string): SessionClaims | null;
}

export type ErrorCode =
  | "invalid_input"
  | "ride_not_found"
  | "ride_ended"
  | "duplicate_name"
  | "unauthorized"
  | "forbidden"
  | "not_member"
  | "throttled"
  | "db_unavailable"
  | "rate_limited"
  | "not_found"
  | "name_taken"
  | "payload_too_large"
  | "unsupported_media"
  | "storage_unavailable"
  | "not_configured"
  | "upstream_unavailable"
  | "internal";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}
