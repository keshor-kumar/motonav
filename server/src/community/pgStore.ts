import type pg from "pg";
import { CommunityCodeTakenError, MemberNameTakenError, type CommunityStore, type NewMessage } from "./store.js";
import type { Community, CommunityMember, StoredMessage } from "./types.js";

const iso = (v: Date | string): string => (v instanceof Date ? v.toISOString() : v);

/* eslint-disable @typescript-eslint/no-explicit-any */
const toCommunity = (r: any): Community => ({ id: r.id, code: r.code, name: r.name, description: r.description, createdAt: iso(r.created_at) });
const toMember = (r: any): CommunityMember => ({
  id: r.id, communityId: r.community_id, name: r.name, isCreator: r.is_creator, joinedAt: iso(r.joined_at), lastSeenAt: iso(r.last_seen_at),
});
const toMessage = (r: any): StoredMessage => ({
  id: r.id, communityId: r.community_id, memberId: r.member_id, senderName: r.sender_name, type: r.type, text: r.text,
  audioPath: r.audio_path, audioDurationMs: r.audio_duration_ms, audioMime: r.audio_mime, audioSizeBytes: r.audio_size_bytes,
  createdAt: iso(r.created_at),
});

const isUnique = (e: unknown) => (e as { code?: string }).code === "23505";
const constraint = (e: unknown) => (e as { constraint?: string }).constraint ?? "";

export class PgCommunityStore implements CommunityStore {
  constructor(private readonly pool: pg.Pool) {}

  async createCommunity(c: { id: string; code: string; name: string; description: string }, creator: { id: string; name: string }) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const r = await client.query(
        "INSERT INTO communities (id, code, name, description) VALUES ($1,$2,$3,$4) RETURNING *",
        [c.id, c.code, c.name, c.description]
      );
      const m = await client.query(
        "INSERT INTO community_members (id, community_id, name, is_creator) VALUES ($1,$2,$3,TRUE) RETURNING *",
        [creator.id, c.id, creator.name]
      );
      await client.query("COMMIT");
      return { community: toCommunity(r.rows[0]), member: toMember(m.rows[0]) };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      if (isUnique(err)) throw new CommunityCodeTakenError();
      throw err;
    } finally {
      client.release();
    }
  }

  async getByCode(code: string) {
    const r = await this.pool.query("SELECT * FROM communities WHERE code = $1", [code]);
    return r.rows[0] ? toCommunity(r.rows[0]) : null;
  }
  async getById(id: string) {
    const r = await this.pool.query("SELECT * FROM communities WHERE id = $1", [id]);
    return r.rows[0] ? toCommunity(r.rows[0]) : null;
  }
  async memberCount(communityId: string) {
    const r = await this.pool.query("SELECT count(*)::int AS n FROM community_members WHERE community_id = $1", [communityId]);
    return r.rows[0].n as number;
  }
  async getMember(communityId: string, memberId: string) {
    const r = await this.pool.query("SELECT * FROM community_members WHERE community_id = $1 AND id = $2", [communityId, memberId]);
    return r.rows[0] ? toMember(r.rows[0]) : null;
  }
  async addMember(communityId: string, member: { id: string; name: string }, isCreator = false) {
    try {
      const r = await this.pool.query(
        "INSERT INTO community_members (id, community_id, name, is_creator) VALUES ($1,$2,$3,$4) RETURNING *",
        [member.id, communityId, member.name, isCreator]
      );
      return toMember(r.rows[0]);
    } catch (err) {
      if (isUnique(err) && constraint(err) === "uq_community_members_name") throw new MemberNameTakenError();
      throw err;
    }
  }
  async touchMember(communityId: string, memberId: string) {
    await this.pool.query("UPDATE community_members SET last_seen_at = now() WHERE community_id = $1 AND id = $2", [communityId, memberId]);
  }
  async addMessage(n: NewMessage) {
    const r = await this.pool.query(
      `INSERT INTO community_messages
         (id, community_id, member_id, sender_name, type, text, audio_path, audio_duration_ms, audio_mime, audio_size_bytes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [n.id, n.communityId, n.memberId, n.senderName, n.type, n.text ?? null, n.audioPath ?? null, n.audioDurationMs ?? null, n.audioMime ?? null, n.audioSizeBytes ?? null]
    );
    return toMessage(r.rows[0]);
  }
  async getMessage(communityId: string, id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const r = await this.pool.query("SELECT * FROM community_messages WHERE community_id = $1 AND id = $2", [communityId, id]);
    return r.rows[0] ? toMessage(r.rows[0]) : null;
  }
  async listMessages(communityId: string, before: string | null, limit: number) {
    const r = before
      ? await this.pool.query("SELECT * FROM community_messages WHERE community_id = $1 AND created_at < $2 ORDER BY created_at DESC LIMIT $3", [communityId, before, limit])
      : await this.pool.query("SELECT * FROM community_messages WHERE community_id = $1 ORDER BY created_at DESC LIMIT $2", [communityId, limit]);
    return r.rows.map(toMessage);
  }
}
