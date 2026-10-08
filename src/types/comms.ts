// Rider-communication types. Mirror server/src/commsTypes.ts (client and server build separately).

export const QUICK_MESSAGE_KINDS = ["stopping", "fuel", "break", "hazard", "slow", "wait", "meet", "emergency"] as const;
export type QuickMessageKind = (typeof QUICK_MESSAGE_KINDS)[number];

export interface VoicePeerInfo {
  riderId: string;
  name: string;
  muted: boolean;
  speaking: boolean;
}

export interface QuickMessageEvent {
  id: string;
  kind: QuickMessageKind;
  riderId: string;
  name: string;
  at: string;
  location: { latitude: number; longitude: number } | null;
}

export interface CommsAck {
  ok: boolean;
  code?: string;
  message?: string;
  peers?: VoicePeerInfo[];
}

export interface IceCandidatePayload {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
  usernameFragment: string | null;
}

/** What the rider list shows next to a rider's name. */
export type CommsStatus = "speaking" | "muted" | "connected" | "connecting" | "reconnecting";
