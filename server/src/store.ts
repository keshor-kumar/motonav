import type { Member, MemberConnection, Ride } from "./types.js";

/** Thrown by a Store when a generated ride code already exists. */
export class CodeTakenError extends Error {}

export interface NewRide {
  id: string;
  rideCode: string;
  rideName: string;
  destination: string;
  destinationLatitude: number;
  destinationLongitude: number;
}

export interface LocationFix {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
}

/** Persistence boundary. Postgres implements it in prod; memory implements it in tests. */
export interface Store {
  createRide(ride: NewRide, creatorId: string, creatorName: string): Promise<{ ride: Ride; member: Member }>;
  getRideByCode(code: string): Promise<Ride | null>;
  getRideById(id: string): Promise<Ride | null>;
  listMembers(rideId: string): Promise<Member[]>;
  getMember(rideId: string, riderId: string): Promise<Member | null>;
  addMember(rideId: string, riderId: string, name: string): Promise<Member>;
  updateLocation(rideId: string, riderId: string, fix: LocationFix): Promise<Member | null>;
  setConnection(rideId: string, riderId: string, status: MemberConnection): Promise<Member | null>;
  markLeft(rideId: string, riderId: string): Promise<void>;
  endRide(rideId: string): Promise<Ride>;
}
