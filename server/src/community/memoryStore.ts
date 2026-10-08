import { CommunityCodeTakenError, MemberNameTakenError, type CommunityStore, type NewMessage } from "./store.js";
import type { Community, CommunityMember, StoredMessage } from "./types.js";

/** In-memory CommunityStore: tests and the no-database local demo fallback. */
export class MemoryCommunityStore implements CommunityStore {
  communities = new Map<string, Community>();
  members = new Map<string, CommunityMember>();
  messages: StoredMessage[] = [];
  private seq = 0;
  private iso = () => new Date().toISOString();

  async createCommunity(c: { id: string; code: string; name: string; description: string }, creator: { id: string; name: string }) {
    for (const x of this.communities.values()) if (x.code === c.code) throw new CommunityCodeTakenError();
    const community: Community = { ...c, createdAt: this.iso() };
    this.communities.set(c.id, community);
    const member = await this.addMember(c.id, creator, true);
    return { community, member };
  }
  async getByCode(code: string) {
    return [...this.communities.values()].find((c) => c.code === code) ?? null;
  }
  async getById(id: string) {
    return this.communities.get(id) ?? null;
  }
  async memberCount(communityId: string) {
    return [...this.members.values()].filter((m) => m.communityId === communityId).length;
  }
  async getMember(communityId: string, memberId: string) {
    const m = this.members.get(memberId);
    return m && m.communityId === communityId ? { ...m } : null;
  }
  async addMember(communityId: string, member: { id: string; name: string }, isCreator = false) {
    const lower = member.name.toLowerCase();
    for (const m of this.members.values()) if (m.communityId === communityId && m.name.toLowerCase() === lower) throw new MemberNameTakenError();
    const m: CommunityMember = { id: member.id, communityId, name: member.name, isCreator, joinedAt: this.iso(), lastSeenAt: this.iso() };
    this.members.set(m.id, m);
    return { ...m };
  }
  async touchMember(_communityId: string, memberId: string) {
    const m = this.members.get(memberId);
    if (m) m.lastSeenAt = this.iso();
  }
  async addMessage(n: NewMessage) {
    // Strictly increasing timestamps so ordering is deterministic even within one millisecond.
    const createdAt = this.iso();
    this.seq++;
    const m: StoredMessage = {
      id: n.id, communityId: n.communityId, memberId: n.memberId, senderName: n.senderName, type: n.type,
      text: n.text ?? null, audioPath: n.audioPath ?? null, audioDurationMs: n.audioDurationMs ?? null,
      audioMime: n.audioMime ?? null, audioSizeBytes: n.audioSizeBytes ?? null, createdAt,
    };
    this.messages.push(m);
    return { ...m };
  }
  async getMessage(communityId: string, id: string) {
    const m = this.messages.find((x) => x.communityId === communityId && x.id === id);
    return m ? { ...m } : null;
  }
  async listMessages(communityId: string, before: string | null, limit: number) {
    const rows = this.messages.filter((m) => m.communityId === communityId && (before === null || m.createdAt < before));
    // newest first; stable by insertion order for equal timestamps
    return rows.map((m, i) => ({ m, i })).sort((a, b) => (a.m.createdAt === b.m.createdAt ? b.i - a.i : a.m.createdAt < b.m.createdAt ? 1 : -1)).slice(0, limit).map((x) => ({ ...x.m }));
  }
}
