// Rider-communication event shapes shared (by convention) with the frontend
// (src/types/comms.ts). Kept in sync by hand — client and server build separately.

export const QUICK_MESSAGE_KINDS = ["stopping", "fuel", "break", "hazard", "slow", "wait", "meet", "emergency"] as const;
export type QuickMessageKind = (typeof QUICK_MESSAGE_KINDS)[number];

/** One rider who has joined the ride's voice channel. */
export interface VoicePeer {
  riderId: string;
  name: string;
  muted: boolean;
  speaking: boolean;
}

export interface QuickMessageEvent {
  id: string;
  kind: QuickMessageKind;
  riderId: string;
  /** Taken from the server-side membership record — never from the client. */
  name: string;
  at: string; // ISO
  /** Sender's last stored position (server-side), so riders can find them. */
  location: { latitude: number; longitude: number } | null;
}

export type CommsErrorCode = "invalid_input" | "not_in_voice" | "voice_full" | "peer_unavailable" | "throttled";

export interface CommsAck {
  ok: boolean;
  code?: CommsErrorCode;
  message?: string;
  peers?: VoicePeer[];
}

export interface IceCandidatePayload {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
  usernameFragment: string | null;
}
