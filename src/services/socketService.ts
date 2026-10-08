import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "@/config/env";
import type { GroupMember, GroupRide } from "@/types";
import type { CommsAck, IceCandidatePayload, QuickMessageEvent, QuickMessageKind, VoicePeerInfo } from "@/types/comms";

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
  // ---- rider communications (same socket, same ride room) ----
  "voice:roster": (payload: { peers: VoicePeerInfo[] }) => void;
  "voice:peer-reset": (payload: { riderId: string }) => void;
  "rtc:offer": (payload: { from: string; sdp: string }) => void;
  "rtc:answer": (payload: { from: string; sdp: string }) => void;
  "rtc:ice": (payload: { from: string; candidate: IceCandidatePayload }) => void;
  "ptt:timeout": () => void;
  "comms:message": (message: QuickMessageEvent) => void;
  "comms:error": (error: { code?: string; message?: string }) => void;
}

export interface LocationPayload {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
}

/** Server's reply to a location update (see server/src/socket.ts). */
export interface LocationAck {
  ok: boolean;
  code?: string;
  message?: string;
}

/** Events the client emits. The last parameter is the acknowledgement callback. */
export interface ClientToServerEvents {
  "location:update": (payload: LocationPayload, ack: (response: LocationAck) => void) => void;
  "voice:join": (ack: (response: CommsAck) => void) => void;
  "voice:leave": () => void;
  "voice:state": (payload: { muted: boolean }) => void;
  "ptt:start": () => void;
  "ptt:stop": () => void;
  "rtc:offer": (payload: { to: string; sdp: string }, ack: (response: CommsAck) => void) => void;
  "rtc:answer": (payload: { to: string; sdp: string }, ack: (response: CommsAck) => void) => void;
  "rtc:ice": (payload: { to: string; candidate: IceCandidatePayload }) => void;
  "comms:message": (payload: { kind: QuickMessageKind }, ack: (response: CommsAck) => void) => void;
}

// Socket<ListenEvents, EmitEvents>: EmitEvents defaults to ListenEvents, so it must be
// given explicitly or emitting client events won't type-check.
export type GroupSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** One socket connection, authenticated with the rider's session token. */
export function connectRideSocket(token: string): GroupSocket {
  const socket: GroupSocket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
  });
  return socket;
}

/** Sends a location update and resolves once the server acks it (or rejects on error/timeout). */
export function sendLocationUpdate(socket: GroupSocket, payload: LocationPayload): Promise<void> {
  return new Promise((resolve, reject) => {
    socket
      .timeout(8000)
      .emit("location:update", payload, (err: Error | null, ack: LocationAck) => {
        if (err) return reject(new Error("Location update timed out."));
        if (!ack?.ok) return reject(new Error(ack?.message || "Location update failed."));
        resolve();
      });
  });
}
