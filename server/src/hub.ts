import type { PublicMember } from "./types.js";

/** Lets the REST layer push realtime events without knowing about Socket.IO. */
export interface Hub {
  memberUpdated(rideId: string, member: PublicMember): void;
  memberLeft(rideId: string, riderId: string): void;
  rideEnded(rideId: string, endedAt: string | null): void;
}

export const noopHub: Hub = {
  memberUpdated() {},
  memberLeft() {},
  rideEnded() {},
};
