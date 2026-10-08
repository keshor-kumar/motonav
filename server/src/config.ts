import "dotenv/config";
import { randomBytes } from "node:crypto";

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface Config {
  port: number;
  isProduction: boolean;
  databaseUrl: string | null;
  jwtSecret: string;
  clientOrigins: string[];
  /** WebRTC ICE servers handed to authenticated riders (TURN credentials stay server-side). */
  iceServers: IceServerConfig[];
  /** Moto News provider key. Server-only. */
  newsApiKey: string | undefined;
  newsApiBaseUrl: string | undefined;
  /** Supabase Storage for community voice messages. Server-only service-role key. All three or none. */
  supabase: { url: string; serviceRoleKey: string; audioBucket: string } | null;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const isProduction = env.NODE_ENV === "production";
  const databaseUrl = env.DATABASE_URL?.trim() || null;
  let jwtSecret = env.JWT_SECRET?.trim() || "";

  // CLIENT_ORIGINS (comma-separated, for multiple allowed origins) and
  // FRONTEND_URL (a single origin) are both accepted — same purpose,
  // different names, since deployments/docs vary on which they expect.
  // If both are set, CLIENT_ORIGINS wins; either one alone is enough.
  const originsSource = env.CLIENT_ORIGINS?.trim() || env.FRONTEND_URL?.trim() || "";

  if (isProduction) {
    const missing: string[] = [];
    if (!databaseUrl) missing.push("DATABASE_URL");
    if (jwtSecret.length < 32) missing.push("JWT_SECRET (at least 32 characters)");
    if (!originsSource) missing.push("CLIENT_ORIGINS or FRONTEND_URL");
    if (missing.length) throw new Error(`Missing/invalid required environment variables: ${missing.join(", ")}`);
  } else if (!jwtSecret) {
    jwtSecret = randomBytes(32).toString("hex");
    console.warn("[config] JWT_SECRET not set — using a random secret (sessions reset on restart). Fine for local dev only.");
  }

  const clientOrigins = (originsSource || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);

  const list = (v: string | undefined) => (v ?? "").split(",").map((u) => u.trim()).filter(Boolean);
  const stunUrls = list(env.STUN_URLS);
  const turnUrls = list(env.TURN_URLS);
  const iceServers: IceServerConfig[] = [{ urls: stunUrls.length ? stunUrls : ["stun:stun.l.google.com:19302"] }];
  if (turnUrls.length && env.TURN_USERNAME && env.TURN_CREDENTIAL) {
    iceServers.push({ urls: turnUrls, username: env.TURN_USERNAME, credential: env.TURN_CREDENTIAL });
  }

  const sbUrl = env.SUPABASE_URL?.trim();
  const sbKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (isProduction && (sbUrl || sbKey) && !(sbUrl && sbKey))
    throw new Error("Set BOTH SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or neither) for community voice storage.");
  const supabase = sbUrl && sbKey ? { url: sbUrl, serviceRoleKey: sbKey, audioBucket: env.SUPABASE_AUDIO_BUCKET?.trim() || "community-audio" } : null;

  return {
    port: Number(env.PORT) || 4000,
    isProduction,
    databaseUrl,
    jwtSecret,
    clientOrigins,
    iceServers,
    newsApiKey: env.NEWS_API_KEY?.trim() || undefined,
    newsApiBaseUrl: env.NEWS_API_BASE_URL?.trim() || undefined,
    supabase,
  };
}
