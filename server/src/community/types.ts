export interface Community {
  id: string;
  code: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface CommunityMember {
  id: string;
  communityId: string;
  name: string;
  isCreator: boolean;
  joinedAt: string;
  lastSeenAt: string;
}

/** A stored message. Audio keeps only the storage *path*; URLs are signed on the way out. */
export interface StoredMessage {
  id: string;
  communityId: string;
  memberId: string;
  senderName: string;
  type: "text" | "audio";
  text: string | null;
  audioPath: string | null;
  audioDurationMs: number | null;
  audioMime: string | null;
  audioSizeBytes: number | null;
  createdAt: string;
}

/** What clients receive (spec: {id, communityId, senderId, senderName, text, createdAt, type}). */
export interface PublicMessage {
  id: string;
  communityId: string;
  senderId: string;
  senderName: string;
  type: "text" | "audio";
  text: string | null;
  audioUrl: string | null;
  audioDurationMs: number | null;
  createdAt: string;
}

export interface PublicCommunityInfo {
  code: string;
  name: string;
  description: string;
  memberCount: number;
}

export interface CommunityClaims {
  memberId: string;
  communityId: string;
}

export interface CommunityAuth {
  sign(claims: CommunityClaims): string;
  verify(token: string): CommunityClaims | null;
}

export interface CommunitySession {
  community: PublicCommunityInfo & { id: string };
  me: { id: string; name: string; isCreator: boolean };
  token: string;
}

/** Lets the REST layer push realtime events without knowing about Socket.IO. */
export interface CommunityHub {
  message(communityId: string, msg: PublicMessage): void;
  memberJoined(communityId: string, info: { name: string; memberCount: number }): void;
}
export const noopCommunityHub: CommunityHub = { message() {}, memberJoined() {} };
