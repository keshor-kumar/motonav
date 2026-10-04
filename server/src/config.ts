import "dotenv/config";
import { randomBytes } from "node:crypto";

export interface Config {
  port: number;
  isProduction: boolean;
  databaseUrl: string | null;
  jwtSecret: string;
  clientOrigins: string[];
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

  return { port: Number(env.PORT) || 4000, isProduction, databaseUrl, jwtSecret, clientOrigins };
}
