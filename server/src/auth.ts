import jwt from "jsonwebtoken";
import type { Auth, SessionClaims } from "./types.js";

/** Rider session tokens: HS256 JWT signed with the server-only JWT_SECRET. */
export class JwtAuth implements Auth {
  constructor(private readonly secret: string, private readonly ttlSeconds = 60 * 60 * 24) {}

  sign(claims: SessionClaims): string {
    return jwt.sign({ rid: claims.rideId, code: claims.rideCode }, this.secret, {
      algorithm: "HS256",
      subject: claims.riderId,
      expiresIn: this.ttlSeconds,
    });
  }

  verify(token: string): SessionClaims | null {
    try {
      const p = jwt.verify(token, this.secret, { algorithms: ["HS256"] }) as jwt.JwtPayload;
      if (typeof p.sub !== "string" || typeof p.rid !== "string" || typeof p.code !== "string") return null;
      return { riderId: p.sub, rideId: p.rid, rideCode: p.code };
    } catch {
      return null;
    }
  }
}
