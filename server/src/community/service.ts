import { randomInt, randomUUID } from "node:crypto";
import { AppError } from "../types.js";
import { SIGNED_URL_TTL_SECONDS, type AudioStorage } from "./storage.js";
import { CommunityCodeTakenError, MemberNameTakenError, type CommunityStore } from "./store.js";
import {
  noopCommunityHub,
  type Community,
  type CommunityAuth,
  type CommunityHub,
  type CommunityMember,
  type CommunitySession,
  type PublicCommunityInfo,
  type PublicMessage,
  type StoredMessage,
} from "./types.js";
import {
  baseAudioMime,
  cleanCommunityName,
  cleanDescription,
  cleanMemberName,
  cleanMessageText,
  COMMUNITY_LIMITS,
  extForMime,
  looksLikeAudio,
  parseCommunityCode,
} from "./validation.js";

/** Who is acting — always derived from a verified token, never from a client-supplied id. */
export interface CommunityContext {
  communityId: string;
  memberId: string;
}

const MAX_MEMBERS = 500;
const TEXT_LIMIT = { count: 12, windowMs: 10_000 }; // 12 text messages / 10 s / member
const AUDIO_LIMIT = { count: 6, windowMs: 60_000 }; // 6 voice messages / minute / member

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** MN + up to 8 letters/digits of the name + 2 digits, e.g. "Chennai Riders" -> MNCHENNAIR42. */
export function generateCommunityCode(name: string, attempt = 0): string {
  const stem = name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  const digits = String(randomInt(attempt < 3 ? 100 : 10000)).padStart(attempt < 3 ? 2 : 4, "0");
  if (stem.length >= 2 && attempt < 6) return `MN${stem}${digits}`;
  let rand = "";
  for (let i = 0; i < 6; i++) rand += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `MN${rand}`;
}

class SlidingLimiter {
  private hits = new Map<string, number[]>();
  constructor(private readonly max: number, private readonly windowMs: number) {}
  take(key: string, now: number): boolean {
    const arr = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (arr.length >= this.max) {
      this.hits.set(key, arr);
      return false;
    }
    arr.push(now);
    this.hits.set(key, arr);
    return true;
  }
  sweep(now: number) {
    for (const [k, arr] of this.hits) if (!arr.some((t) => now - t < this.windowMs)) this.hits.delete(k);
  }
}

export class CommunityService {
  hub: CommunityHub = noopCommunityHub;
  private textLimiter = new SlidingLimiter(TEXT_LIMIT.count, TEXT_LIMIT.windowMs);
  private audioLimiter = new SlidingLimiter(AUDIO_LIMIT.count, AUDIO_LIMIT.windowMs);

  constructor(
    private readonly store: CommunityStore,
    private readonly auth: CommunityAuth,
    private readonly storage: AudioStorage,
    private readonly now: () => number = () => Date.now()
  ) {}

  sweep() {
    this.textLimiter.sweep(this.now());
    this.audioLimiter.sweep(this.now());
  }

  // ---------------------------------------------------------------- communities

  async create(body: unknown): Promise<CommunitySession> {
    if (typeof body !== "object" || body === null) throw new AppError("invalid_input", 400, "Request body is required.");
    const b = body as Record<string, unknown>;
    const name = cleanCommunityName(b.name);
    const description = cleanDescription(b.description);
    const riderName = cleanMemberName(b.riderName);
    const memberId = randomUUID();

    for (let attempt = 0; attempt < 10; attempt++) {
      const id = randomUUID();
      try {
        const { community, member } = await this.store.createCommunity(
          { id, code: generateCommunityCode(name, attempt), name, description },
          { id: memberId, name: riderName }
        );
        return this.session(community, member, 1);
      } catch (err) {
        if (err instanceof CommunityCodeTakenError) continue;
        throw err;
      }
    }
    throw new AppError("internal", 500, "Couldn't allocate a community code. Please try again.");
  }

  async getPublicInfo(rawCode: unknown): Promise<PublicCommunityInfo> {
    const c = await this.requireByCode(rawCode);
    return { code: c.code, name: c.name, description: c.description, memberCount: await this.store.memberCount(c.id) };
  }

  /** Join (or resume, if the bearer token already belongs to this community). No accounts. */
  async join(rawCode: unknown, body: unknown, token?: string): Promise<CommunitySession> {
    const c = await this.requireByCode(rawCode);

    const claims = token ? this.auth.verify(token) : null;
    if (claims && claims.communityId === c.id) {
      const existing = await this.store.getMember(c.id, claims.memberId);
      if (existing) {
        await this.store.touchMember(c.id, existing.id);
        return this.session(c, existing, await this.store.memberCount(c.id));
      }
    }

    if (typeof body !== "object" || body === null) throw new AppError("invalid_input", 400, "Request body is required.");
    const riderName = cleanMemberName((body as Record<string, unknown>).riderName);
    const count = await this.store.memberCount(c.id);
    if (count >= MAX_MEMBERS) throw new AppError("forbidden", 403, "This community is full.");

    let member: CommunityMember;
    try {
      member = await this.store.addMember(c.id, { id: randomUUID(), name: riderName });
    } catch (err) {
      if (err instanceof MemberNameTakenError)
        throw new AppError("name_taken", 409, "That rider name is already used in this community. Pick another.");
      throw err;
    }
    this.hub.memberJoined(c.id, { name: member.name, memberCount: count + 1 });
    return this.session(c, member, count + 1);
  }

  /** Server-side membership check: the token must be valid AND the member must still exist in this community. */
  async authorize(token: string | undefined, rawCode?: unknown): Promise<{ community: Community; member: CommunityMember }> {
    const claims = token ? this.auth.verify(token) : null;
    if (!claims) throw new AppError("unauthorized", 401, "Join the community to continue.");
    const community = await this.store.getById(claims.communityId);
    if (!community) throw new AppError("not_found", 404, "Community not found.");
    if (rawCode !== undefined && parseCommunityCode(rawCode) !== community.code)
      throw new AppError("forbidden", 403, "You're not a member of this community.");
    const member = await this.store.getMember(community.id, claims.memberId);
    if (!member) throw new AppError("not_member", 403, "You're not a member of this community.");
    return { community, member };
  }

  async getSession(token: string | undefined, rawCode?: unknown): Promise<CommunitySession> {
    const { community, member } = await this.authorize(token, rawCode);
    await this.store.touchMember(community.id, member.id);
    return this.session(community, member, await this.store.memberCount(community.id), token);
  }

  // ---------------------------------------------------------------- messages

  /** A fresh, short-lived playable URL for one voice message. The DB only ever stores the object path, so
   *  playback never depends on a URL minted at upload time. Membership is checked on every call. */
  async getAudioUrl(token: string | undefined, rawCode: unknown, messageId: unknown): Promise<{ url: string; expiresInSec: number }> {
    const { community } = await this.authorize(token, rawCode);
    if (typeof messageId !== "string" || messageId.length > 64) throw new AppError("not_found", 404, "Voice message not found.");
    const m = await this.store.getMessage(community.id, messageId);
    if (!m || m.type !== "audio" || !m.audioPath) throw new AppError("not_found", 404, "Voice message not found.");
    return { url: await this.storage.signedUrl(m.audioPath), expiresInSec: SIGNED_URL_TTL_SECONDS };
  }

  async listMessages(token: string | undefined, rawCode: unknown, before: unknown, limit: unknown): Promise<{ messages: PublicMessage[]; hasMore: boolean }> {
    const { community } = await this.authorize(token, rawCode);
    let beforeIso: string | null = null;
    if (typeof before === "string" && before) {
      const t = Date.parse(before);
      if (Number.isNaN(t)) throw new AppError("invalid_input", 400, "Invalid cursor.");
      beforeIso = new Date(t).toISOString();
    }
    const n = Math.min(Math.max(Math.floor(Number(limit)) || COMMUNITY_LIMITS.pageSize, 1), 100);
    const rows = await this.store.listMessages(community.id, beforeIso, n + 1);
    const page = rows.slice(0, n).reverse(); // oldest -> newest for display
    return { messages: await Promise.all(page.map((m) => this.toPublic(m, true))), hasMore: rows.length > n };
  }

  async sendText(ctx: CommunityContext, text: unknown): Promise<PublicMessage> {
    const member = await this.requireMember(ctx);
    const clean = cleanMessageText(text);
    if (!this.textLimiter.take(ctx.memberId, this.now()))
      throw new AppError("rate_limited", 429, "You're sending messages too fast. Slow down a moment.");
    const stored = await this.store.addMessage({
      id: randomUUID(), communityId: ctx.communityId, memberId: ctx.memberId, senderName: member.name, type: "text", text: clean,
    });
    const msg = await this.toPublic(stored);
    this.hub.message(ctx.communityId, msg);
    return msg;
  }

  async sendAudio(ctx: CommunityContext, input: { data: Buffer; contentType: string | undefined; durationMs: unknown }): Promise<PublicMessage> {
    const member = await this.requireMember(ctx);

    const mime = baseAudioMime(input.contentType);
    if (!mime) throw new AppError("unsupported_media", 415, "Unsupported audio format.");
    if (!Buffer.isBuffer(input.data) || input.data.length === 0) throw new AppError("invalid_input", 400, "The recording was empty.");
    if (input.data.length > COMMUNITY_LIMITS.audioMaxBytes)
      throw new AppError("payload_too_large", 413, "That recording is too large. Keep voice messages under a minute.");
    if (!looksLikeAudio(input.data)) throw new AppError("unsupported_media", 415, "That file doesn't look like audio.");

    const dur = Math.round(Number(input.durationMs));
    if (!Number.isFinite(dur) || dur < COMMUNITY_LIMITS.audioMinMs)
      throw new AppError("invalid_input", 400, "Recording too short. Hold the mic a little longer.");
    if (dur > COMMUNITY_LIMITS.audioMaxMs + 1500)
      throw new AppError("invalid_input", 400, `Voice messages are limited to ${COMMUNITY_LIMITS.audioMaxMs / 1000} seconds.`);
    const durationMs = Math.min(dur, COMMUNITY_LIMITS.audioMaxMs);

    if (!this.audioLimiter.take(ctx.memberId, this.now()))
      throw new AppError("rate_limited", 429, "Too many voice messages. Wait a moment and try again.");

    const path = `${ctx.communityId}/${randomUUID()}.${extForMime(mime)}`;
    await this.storage.put(path, input.data, mime); // fails -> nothing is stored in the DB
    const stored = await this.store.addMessage({
      id: randomUUID(), communityId: ctx.communityId, memberId: ctx.memberId, senderName: member.name, type: "audio",
      audioPath: path, audioDurationMs: durationMs, audioMime: mime, audioSizeBytes: input.data.length,
    });
    const msg = await this.toPublic(stored);
    this.hub.message(ctx.communityId, msg);
    return msg;
  }

  // ---------------------------------------------------------------- helpers

  private async requireByCode(rawCode: unknown): Promise<Community> {
    const c = await this.store.getByCode(parseCommunityCode(rawCode));
    if (!c) throw new AppError("not_found", 404, "We couldn't find a community with that code.");
    return c;
  }

  private async requireMember(ctx: CommunityContext): Promise<CommunityMember> {
    const m = await this.store.getMember(ctx.communityId, ctx.memberId);
    if (!m) throw new AppError("not_member", 403, "You're not a member of this community.");
    return m;
  }

  private session(c: Community, m: CommunityMember, memberCount: number, existingToken?: string): CommunitySession {
    return {
      community: { id: c.id, code: c.code, name: c.name, description: c.description, memberCount },
      me: { id: m.id, name: m.name, isCreator: m.isCreator },
      token: existingToken ?? this.auth.sign({ memberId: m.id, communityId: c.id }),
    };
  }

  /** `lenient`: in history listings a storage hiccup yields audioUrl=null instead of failing the whole page. */
  private async toPublic(m: StoredMessage, lenient = false): Promise<PublicMessage> {
    let audioUrl: string | null = null;
    if (m.type === "audio" && m.audioPath) {
      try {
        audioUrl = await this.storage.signedUrl(m.audioPath);
      } catch (err) {
        if (!lenient) throw err;
        console.error("[community] could not sign audio URL:", (err as Error).message);
      }
    }
    return {
      id: m.id, communityId: m.communityId, senderId: m.memberId, senderName: m.senderName, type: m.type,
      text: m.text, audioUrl, audioDurationMs: m.audioDurationMs, createdAt: m.createdAt,
    };
  }
}
