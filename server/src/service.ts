import { randomUUID } from "node:crypto";
import { generateRideCode } from "./rideCode.js";
import { CodeTakenError, type Store } from "./store.js";
import {
  AppError,
  type Auth,
  type Member,
  type PublicMember,
  type PublicRideInfo,
  type Ride,
  type RideDetails,
  type SessionClaims,
} from "./types.js";
import { parseCreateRide, parseJoin, parseLocationUpdate, parseRideCode } from "./validation.js";

const MAX_ACTIVE_MEMBERS = 50;
/** Server-side floor between accepted location updates per rider (clients throttle harder). */
const MIN_LOCATION_INTERVAL_MS = 1000;

export function toPublicMember(m: Member, ride: Ride): PublicMember {
  return {
    riderId: m.userId,
    name: m.name,
    latitude: m.latitude,
    longitude: m.longitude,
    heading: m.heading,
    speed: m.speed,
    lastUpdated: m.lastUpdated,
    connectionStatus: m.connectionStatus === "connected" ? "connected" : "disconnected",
    isCreator: m.userId === ride.createdBy,
  };
}

export function toRideDetails(r: Ride): RideDetails {
  const { id, rideCode, rideName, destination, destinationLatitude, destinationLongitude, status, createdBy, createdAt, endedAt } = r;
  return { id, rideCode, rideName, destination, destinationLatitude, destinationLongitude, status, createdBy, createdAt, endedAt };
}

export interface SessionResult {
  ride: RideDetails;
  me: PublicMember;
  members: PublicMember[];
  token: string;
}

/**
 * All group-ride rules live here, independent of Express/Socket.IO/Postgres,
 * so they can be exercised directly in tests. Every entry point re-validates
 * input and re-checks membership — nothing trusts the client's claim.
 */
export class RideService {
  private lastLocationAt = new Map<string, number>();

  constructor(
    private readonly store: Store,
    private readonly auth: Auth,
    private readonly now: () => number = () => Date.now()
  ) {}

  async createRide(body: unknown): Promise<SessionResult> {
    const input = parseCreateRide(body);
    const creatorId = randomUUID();

    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        const { ride, member } = await this.store.createRide(
          {
            id: randomUUID(),
            rideCode: generateRideCode(),
            rideName: input.rideName,
            destination: input.destination,
            destinationLatitude: input.destinationLatitude,
            destinationLongitude: input.destinationLongitude,
          },
          creatorId,
          input.riderName
        );
        return this.session(ride, member, [member]);
      } catch (err) {
        if (err instanceof CodeTakenError) continue; // astronomically rare — pick another code
        throw err;
      }
    }
    throw new AppError("internal", 500, "Couldn't allocate a ride code. Please try again.");
  }

  async getPublicInfo(rawCode: unknown): Promise<PublicRideInfo> {
    const ride = await this.requireRideByCode(rawCode);
    const members = await this.store.listMembers(ride.id);
    return {
      rideCode: ride.rideCode,
      rideName: ride.rideName,
      destination: ride.destination,
      status: ride.status,
      memberCount: members.length,
    };
  }

  /** Join (or safely re-join with an existing valid token — never a duplicate session). */
  async join(rawCode: unknown, body: unknown, existingToken?: string): Promise<SessionResult> {
    const ride = await this.requireRideByCode(rawCode);
    if (ride.status === "ended") throw new AppError("ride_ended", 410, "This ride has ended.");

    // Re-join: same rider presenting a valid token for THIS ride keeps their identity.
    if (existingToken) {
      const claims = this.auth.verify(existingToken);
      if (claims && claims.rideId === ride.id) {
        const existing = await this.store.getMember(ride.id, claims.riderId);
        if (existing && existing.connectionStatus !== "left") {
          const members = await this.store.listMembers(ride.id);
          return this.session(ride, existing, members);
        }
      }
    }

    const { riderName } = parseJoin(body);
    const members = await this.store.listMembers(ride.id);
    if (members.length >= MAX_ACTIVE_MEMBERS) throw new AppError("forbidden", 403, "This ride is full.");
    if (members.some((m) => m.name.toLowerCase() === riderName.toLowerCase())) {
      throw new AppError("duplicate_name", 409, "Someone in this ride is already using that name. Try another.");
    }

    const member = await this.store.addMember(ride.id, randomUUID(), riderName);
    return this.session(ride, member, [...members, member]);
  }

  /** Verifies the token AND that the member is still active in the ride. */
  async authorize(token: string | undefined): Promise<{ ride: Ride; member: Member; claims: SessionClaims }> {
    const claims = token ? this.auth.verify(token) : null;
    if (!claims) throw new AppError("unauthorized", 401, "Your session is invalid or expired. Please rejoin the ride.");
    const ride = await this.store.getRideById(claims.rideId);
    if (!ride) throw new AppError("ride_not_found", 404, "Ride not found.");
    const member = await this.store.getMember(ride.id, claims.riderId);
    if (!member || member.connectionStatus === "left") {
      throw new AppError("not_member", 403, "You're no longer a member of this ride.");
    }
    return { ride, member, claims };
  }

  async getState(token: string | undefined) {
    const { ride, member } = await this.authorize(token);
    const members = ride.status === "active" ? await this.store.listMembers(ride.id) : [];
    return {
      ride: toRideDetails(ride),
      me: toPublicMember(member, ride),
      members: members.map((m) => toPublicMember(m, ride)),
    };
  }

  async setConnected(rideId: string, riderId: string): Promise<PublicMember | null> {
    const ride = await this.store.getRideById(rideId);
    if (!ride || ride.status !== "active") return null;
    const m = await this.store.setConnection(rideId, riderId, "connected");
    return m ? toPublicMember(m, ride) : null;
  }

  async setDisconnected(rideId: string, riderId: string): Promise<PublicMember | null> {
    const ride = await this.store.getRideById(rideId);
    if (!ride || ride.status !== "active") return null;
    const m = await this.store.setConnection(rideId, riderId, "disconnected");
    return m ? toPublicMember(m, ride) : null;
  }

  /** Validate + persist the rider's latest position. Latest only — no history is kept. */
  async applyLocation(rideId: string, riderId: string, payload: unknown): Promise<PublicMember> {
    const fix = parseLocationUpdate(payload);
    const key = `${rideId}:${riderId}`;
    const t = this.now();
    const last = this.lastLocationAt.get(key);
    if (last !== undefined && t - last < MIN_LOCATION_INTERVAL_MS) {
      throw new AppError("throttled", 429, "Location updates are too frequent.");
    }
    this.lastLocationAt.set(key, t);

    const member = await this.store.updateLocation(rideId, riderId, fix);
    if (!member) {
      this.lastLocationAt.delete(key);
      throw new AppError("forbidden", 403, "You can't share location in this ride.");
    }
    const ride = await this.store.getRideById(rideId);
    return toPublicMember(member, ride!);
  }

  /** Leaves the ride. If nobody is left, the ride ends so it can't linger unjoinable-but-active. */
  async leave(token: string | undefined): Promise<{ rideId: string; riderId: string; rideEnded: boolean }> {
    const { ride, claims } = await this.authorize(token);
    await this.store.markLeft(ride.id, claims.riderId);
    this.lastLocationAt.delete(`${ride.id}:${claims.riderId}`);
    let rideEnded = false;
    if (ride.status === "active") {
      const remaining = await this.store.listMembers(ride.id);
      if (remaining.length === 0) {
        await this.store.endRide(ride.id);
        rideEnded = true;
      }
    }
    return { rideId: ride.id, riderId: claims.riderId, rideEnded };
  }

  async end(token: string | undefined): Promise<RideDetails> {
    const { ride, claims } = await this.authorize(token);
    if (ride.createdBy !== claims.riderId) {
      throw new AppError("forbidden", 403, "Only the ride creator can end the ride.");
    }
    if (ride.status === "ended") return toRideDetails(ride);
    const ended = await this.store.endRide(ride.id);
    return toRideDetails(ended);
  }

  private async requireRideByCode(rawCode: unknown): Promise<Ride> {
    const code = parseRideCode(rawCode);
    const ride = await this.store.getRideByCode(code);
    if (!ride) throw new AppError("ride_not_found", 404, "We couldn't find that ride. Check the link and try again.");
    return ride;
  }

  private session(ride: Ride, member: Member, members: Member[]): SessionResult {
    const token = this.auth.sign({ riderId: member.userId, rideId: ride.id, rideCode: ride.rideCode });
    return {
      ride: toRideDetails(ride),
      me: toPublicMember(member, ride),
      members: members.map((m) => toPublicMember(m, ride)),
      token,
    };
  }
}
