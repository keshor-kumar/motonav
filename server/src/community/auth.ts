import jwt from "jsonwebtoken";
import type { CommunityAuth, CommunityClaims } from "./types.js";

/**
 * Community member tokens. Same server-only JWT_SECRET as ride sessions, but a distinct claim shape
 * ("typ":"community") — a ride token can never pass as a community token or vice-versa.
 */
export class JwtCommunityAuth implements CommunityAuth {
  constructor(private readonly secret: string, private readonly ttlSeconds = 60 * 60 * 24 * 90) {}

  sign(c: CommunityClaims): string {
    return jwt.sign({ typ: "community", cid: c.communityId }, this.secret, { algorithm: "HS256", subject: c.memberId, expiresIn: this.ttlSeconds });
  }

  verify(token: string): CommunityClaims | null {
    try {
      const p = jwt.verify(token, this.secret, { algorithms: ["HS256"] }) as jwt.JwtPayload;
      if (p.typ !== "community" || typeof p.sub !== "string" || typeof p.cid !== "string") return null;
      return { memberId: p.sub, communityId: p.cid };
    } catch {
      return null;
    }
  }
}
