import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "@/config/env";
import type { CommunityMessage } from "@/services/communityService";

// Moto Community realtime lives in its own Socket.IO namespace ("/community"), so it can never
// interfere with the ride socket's rooms or events. The server derives community + sender from the
// verified token — nothing about identity is taken from event payloads.

export interface CommunityServerEvents {
  "community:message": (message: CommunityMessage) => void;
  "community:audio-message": (message: CommunityMessage) => void;
  "community:member-joined": (info: { name: string; memberCount: number }) => void;
  "community:typing": (info: { memberId: string; name: string; typing: boolean }) => void;
  "community:error": (error: { code?: string; message?: string }) => void;
}

export interface CommunityAck {
  ok: boolean;
  code?: string;
  message?: CommunityMessage | string;
}

export interface CommunityClientEvents {
  "community:join": (ack: (r: { ok: boolean; code?: string; message?: string }) => void) => void;
  "community:leave": () => void;
  "community:message": (payload: { text: string }, ack: (r: { ok: boolean; code?: string; message?: string | CommunityMessage }) => void) => void;
  "community:typing": (payload: { typing: boolean }) => void;
}

export type CommunitySocket = Socket<CommunityServerEvents, CommunityClientEvents>;

export function connectCommunitySocket(token: string): CommunitySocket {
  return io(`${SOCKET_URL}/community`, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
  });
}
