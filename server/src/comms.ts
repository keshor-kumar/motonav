import { randomUUID } from "node:crypto";
import { AppError } from "./types.js";
import {
  QUICK_MESSAGE_KINDS,
  type CommsAck,
  type CommsErrorCode,
  type IceCandidatePayload,
  type QuickMessageEvent,
  type QuickMessageKind,
  type VoicePeer,
} from "./commsTypes.js";

// ============================================================
// Rider communications: WebRTC signalling relay, push-to-talk state and
// quick ride messages — all riding on the EXISTING ride room/socket.
//
// Audio never touches this server: it only relays small signalling
// messages (SDP / ICE) between riders of the SAME ride. Every handler
// derives the ride and rider from the authenticated socket context
// (set from the verified session token) — a ride id or rider id sent by
// the client is never trusted; relay targets must be voice participants
// of the sender's own ride.
//
// State is in-memory (live presence only — nothing is persisted, no audio
// is stored). Running several server instances would need a shared
// adapter; a single instance is what this deployment uses.
// ============================================================

export const MAX_VOICE_PARTICIPANTS = 8; // full-mesh P2P limit; beyond this use an SFU
export const MAX_PTT_MS = 45_000; // stuck-button watchdog
export const MESSAGE_MIN_INTERVAL_MS = 1000;

const MAX_SDP_LENGTH = 16_000;
const MAX_CANDIDATE_LENGTH = 2_000;
const ID_RE = /^[A-Za-z0-9-]{8,64}$/;

export interface CommsTransport {
  toRide(rideId: string, event: string, payload: unknown): void;
  /** Returns false when that rider has no live socket. */
  toRider(rideId: string, riderId: string, event: string, payload: unknown): boolean;
}

export interface CommsContext {
  rideId: string;
  riderId: string;
  name: string;
}

export interface CommsDeps {
  now?: () => number;
  /** Schedules `fn` after `ms`; returns a cancel function. */
  schedule?: (fn: () => void, ms: number) => () => void;
  getLocation?: (rideId: string, riderId: string) => Promise<{ latitude: number; longitude: number } | null>;
  maxVoiceParticipants?: number;
}

// ---------- validation (every value from the network passes through here) ----------

const invalid = (msg: string) => new AppError("invalid_input", 400, msg);

function parseTarget(value: unknown): string {
  if (typeof value !== "string" || !ID_RE.test(value)) throw invalid("Invalid rider.");
  return value;
}

function asRecord(payload: unknown): Record<string, unknown> {
  if (typeof payload !== "object" || payload === null) throw invalid("Payload is required.");
  return payload as Record<string, unknown>;
}

export function parseSessionDescription(payload: unknown): { to: string; sdp: string } {
  const p = asRecord(payload);
  const sdp = p.sdp;
  if (typeof sdp !== "string" || sdp.length === 0 || sdp.length > MAX_SDP_LENGTH || !sdp.startsWith("v=0")) {
    throw invalid("Invalid session description.");
  }
  return { to: parseTarget(p.to), sdp };
}

export function parseIceCandidate(payload: unknown): { to: string; candidate: IceCandidatePayload } {
  const p = asRecord(payload);
  const c = asRecord(p.candidate);
  const { candidate, sdpMid, sdpMLineIndex, usernameFragment } = c;
  if (typeof candidate !== "string" || candidate.length > MAX_CANDIDATE_LENGTH) throw invalid("Invalid ICE candidate.");
  if (sdpMid !== null && sdpMid !== undefined && (typeof sdpMid !== "string" || sdpMid.length > 64)) throw invalid("Invalid ICE candidate.");
  if (
    sdpMLineIndex !== null &&
    sdpMLineIndex !== undefined &&
    (typeof sdpMLineIndex !== "number" || !Number.isInteger(sdpMLineIndex) || sdpMLineIndex < 0 || sdpMLineIndex > 64)
  ) {
    throw invalid("Invalid ICE candidate.");
  }
  if (usernameFragment !== null && usernameFragment !== undefined && (typeof usernameFragment !== "string" || usernameFragment.length > 256)) {
    throw invalid("Invalid ICE candidate.");
  }
  return {
    to: parseTarget(p.to),
    candidate: {
      candidate,
      sdpMid: typeof sdpMid === "string" ? sdpMid : null,
      sdpMLineIndex: typeof sdpMLineIndex === "number" ? sdpMLineIndex : null,
      usernameFragment: typeof usernameFragment === "string" ? usernameFragment : null,
    },
  };
}

export function parseMuted(payload: unknown): boolean {
  const muted = asRecord(payload).muted;
  if (typeof muted !== "boolean") throw invalid("Invalid state.");
  return muted;
}

export function parseQuickMessage(payload: unknown): QuickMessageKind {
  const kind = asRecord(payload).kind;
  if (typeof kind !== "string" || !(QUICK_MESSAGE_KINDS as readonly string[]).includes(kind)) throw invalid("Unknown message.");
  return kind as QuickMessageKind;
}

// ---------- controller ----------

interface VoiceMember {
  name: string;
  muted: boolean;
  speaking: boolean;
  cancelWatchdog: (() => void) | null;
}

export class CommsController {
  private readonly rooms = new Map<string, Map<string, VoiceMember>>();
  private readonly lastMessageAt = new Map<string, number>();
  private readonly now: () => number;
  private readonly schedule: (fn: () => void, ms: number) => () => void;
  private readonly getLocation: NonNullable<CommsDeps["getLocation"]>;
  private readonly maxVoice: number;

  constructor(private readonly transport: CommsTransport, deps: CommsDeps = {}) {
    this.now = deps.now ?? (() => Date.now());
    this.schedule =
      deps.schedule ??
      ((fn, ms) => {
        const t = setTimeout(fn, ms);
        t.unref?.();
        return () => clearTimeout(t);
      });
    this.getLocation = deps.getLocation ?? (async () => null);
    this.maxVoice = deps.maxVoiceParticipants ?? MAX_VOICE_PARTICIPANTS;
  }

  roster(rideId: string): VoicePeer[] {
    const room = this.rooms.get(rideId);
    if (!room) return [];
    return [...room.entries()].map(([riderId, m]) => ({ riderId, name: m.name, muted: m.muted, speaking: m.speaking }));
  }

  private broadcastRoster(rideId: string): void {
    this.transport.toRide(rideId, "voice:roster", { peers: this.roster(rideId) });
  }

  private fail(code: CommsErrorCode, message: string): CommsAck {
    return { ok: false, code, message };
  }

  private toAck(err: unknown): CommsAck {
    if (err instanceof AppError) return this.fail("invalid_input", err.message);
    return this.fail("invalid_input", "Request failed.");
  }

  private member(ctx: CommsContext): VoiceMember | undefined {
    return this.rooms.get(ctx.rideId)?.get(ctx.riderId);
  }

  // ----- voice presence -----

  joinVoice(ctx: CommsContext): CommsAck {
    let room = this.rooms.get(ctx.rideId);
    const existing = room?.get(ctx.riderId);
    if (!existing && room && room.size >= this.maxVoice) {
      return this.fail("voice_full", "Voice is full for this ride.");
    }
    if (!room) {
      room = new Map();
      this.rooms.set(ctx.rideId, room);
    }
    if (existing) {
      // Same rider re-joining (new socket / network change): peers must rebuild their link.
      existing.cancelWatchdog?.();
      existing.cancelWatchdog = null;
      existing.speaking = false;
      existing.name = ctx.name;
      this.transport.toRide(ctx.rideId, "voice:peer-reset", { riderId: ctx.riderId });
    } else {
      room.set(ctx.riderId, { name: ctx.name, muted: false, speaking: false, cancelWatchdog: null });
    }
    this.broadcastRoster(ctx.rideId);
    return { ok: true, peers: this.roster(ctx.rideId) };
  }

  leaveVoice(ctx: CommsContext): void {
    this.removeRider(ctx.rideId, ctx.riderId);
  }

  /** Drops a rider's voice presence (leave, disconnect, removed from ride). Idempotent. */
  removeRider(rideId: string, riderId: string): void {
    const room = this.rooms.get(rideId);
    const m = room?.get(riderId);
    if (!room || !m) return;
    m.cancelWatchdog?.();
    room.delete(riderId);
    if (room.size === 0) this.rooms.delete(rideId);
    this.broadcastRoster(rideId);
  }

  /** Ride ended: forget everything about it. */
  removeRide(rideId: string): void {
    const room = this.rooms.get(rideId);
    if (room) for (const m of room.values()) m.cancelWatchdog?.();
    this.rooms.delete(rideId);
    for (const k of [...this.lastMessageAt.keys()]) if (k.startsWith(`${rideId}:`)) this.lastMessageAt.delete(k);
  }

  onDisconnect(ctx: CommsContext): void {
    this.removeRider(ctx.rideId, ctx.riderId);
    this.lastMessageAt.delete(`${ctx.rideId}:${ctx.riderId}`);
  }

  // ----- push-to-talk / mute -----

  setMuted(ctx: CommsContext, payload: unknown): CommsAck {
    try {
      const muted = parseMuted(payload);
      const m = this.member(ctx);
      if (!m) return this.fail("not_in_voice", "Join voice first.");
      m.muted = muted;
      if (muted && m.speaking) this.endSpeaking(ctx.rideId, ctx.riderId, m);
      this.broadcastRoster(ctx.rideId);
      return { ok: true };
    } catch (err) {
      return this.toAck(err);
    }
  }

  startSpeaking(ctx: CommsContext): CommsAck {
    const m = this.member(ctx);
    if (!m) return this.fail("not_in_voice", "Join voice first.");
    if (m.muted) return this.fail("invalid_input", "Your microphone is muted.");
    m.cancelWatchdog?.();
    m.cancelWatchdog = this.schedule(() => this.autoStop(ctx.rideId, ctx.riderId), MAX_PTT_MS);
    if (!m.speaking) {
      m.speaking = true;
      this.broadcastRoster(ctx.rideId);
    }
    return { ok: true };
  }

  stopSpeaking(ctx: CommsContext): CommsAck {
    const m = this.member(ctx);
    if (!m) return this.fail("not_in_voice", "Join voice first.");
    if (m.speaking) {
      this.endSpeaking(ctx.rideId, ctx.riderId, m);
      this.broadcastRoster(ctx.rideId);
    }
    return { ok: true };
  }

  private endSpeaking(_rideId: string, _riderId: string, m: VoiceMember): void {
    m.cancelWatchdog?.();
    m.cancelWatchdog = null;
    m.speaking = false;
  }

  private autoStop(rideId: string, riderId: string): void {
    const m = this.rooms.get(rideId)?.get(riderId);
    if (!m || !m.speaking) return;
    this.endSpeaking(rideId, riderId, m);
    this.broadcastRoster(rideId);
    this.transport.toRider(rideId, riderId, "ptt:timeout", {});
  }

  // ----- WebRTC signalling relay -----

  relay(ctx: CommsContext, event: "rtc:offer" | "rtc:answer" | "rtc:ice", payload: unknown): CommsAck {
    try {
      const parsed = event === "rtc:ice" ? parseIceCandidate(payload) : parseSessionDescription(payload);
      if (!this.member(ctx)) return this.fail("not_in_voice", "Join voice first.");
      if (parsed.to === ctx.riderId) return this.fail("invalid_input", "Invalid rider.");
      // The target must be a voice participant of the SENDER'S ride (rooms are keyed by the
      // server-derived ride id), so signalling can never cross into another ride.
      if (!this.rooms.get(ctx.rideId)?.has(parsed.to)) return this.fail("peer_unavailable", "That rider isn't in voice.");
      const body = event === "rtc:ice" ? { from: ctx.riderId, candidate: (parsed as { candidate: IceCandidatePayload }).candidate } : { from: ctx.riderId, sdp: (parsed as { sdp: string }).sdp };
      const delivered = this.transport.toRider(ctx.rideId, parsed.to, event, body);
      return delivered ? { ok: true } : this.fail("peer_unavailable", "That rider is offline.");
    } catch (err) {
      return this.toAck(err);
    }
  }

  // ----- quick ride messages -----

  async sendQuickMessage(ctx: CommsContext, payload: unknown): Promise<CommsAck> {
    try {
      const kind = parseQuickMessage(payload);
      const k = `${ctx.rideId}:${ctx.riderId}`;
      const t = this.now();
      const last = this.lastMessageAt.get(k);
      if (last !== undefined && t - last < MESSAGE_MIN_INTERVAL_MS) {
        return this.fail("throttled", "Wait a moment before sending another message.");
      }
      this.lastMessageAt.set(k, t);

      let location: QuickMessageEvent["location"] = null;
      try {
        location = await this.getLocation(ctx.rideId, ctx.riderId);
      } catch {
        location = null; // a missing location must never block a message
      }
      const event: QuickMessageEvent = {
        id: randomUUID(),
        kind,
        riderId: ctx.riderId,
        name: ctx.name,
        at: new Date(t).toISOString(),
        location,
      };
      this.transport.toRide(ctx.rideId, "comms:message", event);
      return { ok: true };
    } catch (err) {
      return this.toAck(err);
    }
  }
}
