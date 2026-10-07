import { CodeTakenError, type LocationFix, type NewRide, type Store } from "./store.js";
import type { Member, MemberConnection, Ride } from "./types.js";

/** In-memory Store used by tests (and a no-database local demo fallback). */
export class MemoryStore implements Store {
  rides = new Map<string, Ride>();
  members = new Map<string, Member>(); // key: rideId:userId

  private k = (rideId: string, userId: string) => `${rideId}:${userId}`;
  private iso = () => new Date().toISOString();

  async createRide(input: NewRide, creatorId: string, creatorName: string) {
    for (const r of this.rides.values()) if (r.rideCode === input.rideCode) throw new CodeTakenError();
    const ride: Ride = { ...input, createdBy: creatorId, createdAt: this.iso(), status: "active", endedAt: null };
    this.rides.set(ride.id, ride);
    const member = await this.addMember(ride.id, creatorId, creatorName);
    return { ride, member };
  }
  async getRideByCode(code: string) {
    return [...this.rides.values()].find((r) => r.rideCode === code) ?? null;
  }
  async getRideById(id: string) {
    return this.rides.get(id) ?? null;
  }
  async listMembers(rideId: string) {
    return [...this.members.values()].filter((m) => m.rideId === rideId && m.connectionStatus !== "left");
  }
  async getMember(rideId: string, riderId: string) {
    return this.members.get(this.k(rideId, riderId)) ?? null;
  }
  async addMember(rideId: string, riderId: string, name: string) {
    const m: Member = {
      rideId,
      userId: riderId,
      name,
      latitude: null,
      longitude: null,
      heading: null,
      speed: null,
      lastUpdated: this.iso(),
      connectionStatus: "disconnected",
      joinedAt: this.iso(),
    };
    this.members.set(this.k(rideId, riderId), m);
    return { ...m };
  }
  async updateLocation(rideId: string, riderId: string, fix: LocationFix) {
    const ride = this.rides.get(rideId);
    const m = this.members.get(this.k(rideId, riderId));
    if (!ride || ride.status !== "active" || !m || m.connectionStatus === "left") return null;
    Object.assign(m, fix, { lastUpdated: this.iso(), connectionStatus: "connected" as MemberConnection });
    return { ...m };
  }
  async setConnection(rideId: string, riderId: string, status: MemberConnection) {
    const m = this.members.get(this.k(rideId, riderId));
    if (!m || m.connectionStatus === "left") return null;
    m.connectionStatus = status;
    m.lastUpdated = this.iso();
    return { ...m };
  }
  async markLeft(rideId: string, riderId: string) {
    const m = this.members.get(this.k(rideId, riderId));
    if (m) Object.assign(m, { connectionStatus: "left", latitude: null, longitude: null, heading: null, speed: null });
  }
  async endRide(rideId: string) {
    const ride = this.rides.get(rideId)!;
    ride.status = "ended";
    ride.endedAt = this.iso();
    for (const m of this.members.values()) {
      if (m.rideId === rideId) Object.assign(m, { latitude: null, longitude: null, heading: null, speed: null, connectionStatus: "disconnected" });
    }
    return { ...ride };
  }
}
