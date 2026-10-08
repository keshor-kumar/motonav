import type { Community, CommunityMember, StoredMessage } from "./types.js";

export class CommunityCodeTakenError extends Error {}
export class MemberNameTakenError extends Error {}

export interface NewMessage {
  id: string;
  communityId: string;
  memberId: string;
  senderName: string;
  type: "text" | "audio";
  text?: string;
  audioPath?: string;
  audioDurationMs?: number;
  audioMime?: string;
  audioSizeBytes?: number;
}

export interface CommunityStore {
  createCommunity(c: { id: string; code: string; name: string; description: string }, creator: { id: string; name: string }): Promise<{ community: Community; member: CommunityMember }>;
  getByCode(code: string): Promise<Community | null>;
  getById(id: string): Promise<Community | null>;
  memberCount(communityId: string): Promise<number>;
  getMember(communityId: string, memberId: string): Promise<CommunityMember | null>;
  addMember(communityId: string, member: { id: string; name: string }, isCreator?: boolean): Promise<CommunityMember>;
  touchMember(communityId: string, memberId: string): Promise<void>;
  addMessage(m: NewMessage): Promise<StoredMessage>;
  /** Newest-first page of messages strictly older than `before` (ISO), max `limit`. */
  listMessages(communityId: string, before: string | null, limit: number): Promise<StoredMessage[]>;
  /** One message, scoped to its community (never returns another community's message). */
  getMessage(communityId: string, id: string): Promise<StoredMessage | null>;
}
