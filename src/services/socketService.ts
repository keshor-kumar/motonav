import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "@/config/env";
import type { GroupMember, GroupRide } from "@/types";

// ============================================================
// Thin Socket.IO client wrapper. Everyone in the same ride joins
// the same server-side room ("ride:<rideId>") — this module just
// exposes that connection's events with real types; the server
// (server/src/socket.ts) is what actually enforces room membership.
// ============================================================

export interface ServerToClientEvents {
  "ride:state": (state: { ride: GroupRide; me: GroupMember; members: GroupMember[] }) => void;
  "member:update": (member: GroupMember) => void;
  "member:left": (payload: { riderId: string }) => void;
  "ride:ended": (payload: { endedAt: string | null }) => void;
  "session:left": () => void;
  "session:replaced": () => void;
  "server:error": (error: { code: string; message: string }) => void;
}

export interface LocationPayload {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
}

export type GroupSocket = Socket<ServerToClientEvents>;

/** One socket connection, authenticated with the rider's session token. */
export function connectRideSocket(token: string): GroupSocket {
  return io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
  });
}

/** Sends a location update and resolves once the server acks it (or rejects on error/timeout). */
export function sendLocationUpdate(socket: GroupSocket, payload: LocationPayload): Promise<void> {
  return new Promise((resolve, reject) => {
    socket
      .timeout(8000)
      .emit("location:update", payload, (err: Error | null, ack?: { ok: boolean; message?: string }) => {
        if (err) return reject(new Error("Location update timed out."));
        if (!ack?.ok) return reject(new Error(ack?.message || "Location update failed."));
        resolve();
      });
  });
}
