import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import type { Config } from "./config.js";
import type { Hub } from "./hub.js";
import type { RideService } from "./service.js";
import { AppError } from "./types.js";
import { communityRouter } from "./community/routes.js";
import type { CommunityService } from "./community/service.js";
import type { MemoryAudioStorage } from "./community/storage.js";
import type { NewsService } from "./news.js";

/** Tiny fixed-window per-IP limiter (no extra dependency). */
export function rateLimit(maxPerWindow: number, windowMs = 60_000) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
  }, windowMs).unref();
  return (req: Request, _res: Response, next: NextFunction) => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (++entry.count > maxPerWindow) return next(new AppError("rate_limited", 429, "Too many requests. Please slow down."));
    next();
  };
}

const bearer = (req: Request): string | undefined => {
  const h = req.header("authorization");
  return h?.startsWith("Bearer ") ? h.slice(7) : undefined;
};

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

/** Optional Stage-5 modules. Omitted in the original ride tests; wired in index.ts. */
export interface AppExtras {
  community?: CommunityService;
  /** Dev fallback audio store; null/undefined when Supabase Storage is configured. */
  memoryAudio?: MemoryAudioStorage | null;
  news?: NewsService;
}

export function createApp(service: RideService, hub: Hub, config: Config, extras: AppExtras = {}) {
  const app = express();
  app.set("trust proxy", 1); // behind Render/Railway/Fly proxies — correct client IP for rate limiting
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || config.clientOrigins.includes(origin)),
      allowedHeaders: ["Content-Type", "Authorization", "X-Audio-Duration-Ms"],
    })
  );
  app.use(express.json({ limit: "10kb" }));

  app.get("/health", (_req, res) => void res.json({ ok: true }));

  app.post(
    "/api/rides",
    rateLimit(10),
    wrap(async (req, res) => {
      const result = await service.createRide(req.body);
      res.status(201).json(result);
    })
  );

  app.get(
    "/api/rides/:code",
    rateLimit(120),
    wrap(async (req, res) => {
      res.json(await service.getPublicInfo(req.params.code));
    })
  );

  // Also accepts the code in the body per the spec's "POST /api/rides/join" shape.
  app.post(
    "/api/rides/join",
    rateLimit(30),
    wrap(async (req, res) => {
      const code = (req.body as Record<string, unknown> | null)?.rideCode;
      const result = await service.join(code, req.body, bearer(req));
      const me = result.members.find((m) => m.riderId === result.me.riderId);
      if (me) hub.memberUpdated(result.ride.id, me);
      res.json(result);
    })
  );

  app.post(
    "/api/rides/:code/join",
    rateLimit(30),
    wrap(async (req, res) => {
      const result = await service.join(req.params.code, req.body, bearer(req));
      const me = result.members.find((m) => m.riderId === result.me.riderId);
      if (me) hub.memberUpdated(result.ride.id, me);
      res.json(result);
    })
  );

  app.get(
    "/api/session",
    rateLimit(120),
    wrap(async (req, res) => {
      res.json(await service.getState(bearer(req)));
    })
  );

  // WebRTC ICE servers for voice. Authenticated (rider session token) so TURN credentials
  // are only ever handed to riders of an active ride.
  app.get(
    "/api/comms/ice",
    rateLimit(60),
    wrap(async (req, res) => {
      await service.authorize(bearer(req));
      res.json({ iceServers: config.iceServers });
    })
  );

  app.post(
    "/api/session/leave",
    rateLimit(30),
    wrap(async (req, res) => {
      const out = await service.leave(bearer(req));
      hub.memberLeft(out.rideId, out.riderId);
      if (out.rideEnded) hub.rideEnded(out.rideId, new Date().toISOString());
      res.json({ ok: true });
    })
  );

  app.post(
    "/api/session/end",
    rateLimit(30),
    wrap(async (req, res) => {
      const ride = await service.end(bearer(req));
      hub.rideEnded(ride.id, ride.endedAt);
      res.json({ ride });
    })
  );

  // ---- Moto Community (text + voice chat) — separate router, separate tables, separate token type ----
  if (extras.community) {
    app.use("/api/community", communityRouter({ service: extras.community, memoryAudio: extras.memoryAudio ?? null, rateLimit }));
  }

  // ---- Moto News: server-side proxy so NEWS_API_KEY never reaches the browser ----
  const news = extras.news;
  if (news) {
    app.get(
      "/api/news/motorcycle",
      rateLimit(60),
      wrap(async (req, res) => {
        const category = typeof req.query.category === "string" ? req.query.category : undefined;
        const force = req.query.refresh === "1" || req.query.refresh === "true";
        const result = await news.get({ category, force });
        res.setHeader("Cache-Control", "public, max-age=120");
        res.json(result);
      })
    );
  }

  app.use((_req, _res, next) => next(new AppError("ride_not_found", 404, "Not found.")));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: { code: err.code, message: err.message } });
      return;
    }
    if ((err as { type?: string }).type === "entity.too.large") {
      res.status(413).json({ error: { code: "payload_too_large", message: "That upload is too large." } });
      return;
    }
    if (err instanceof SyntaxError) {
      res.status(400).json({ error: { code: "invalid_input", message: "Malformed request body." } });
      return;
    }
    const code = (err as { code?: string }).code;
    const dbDown = code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "ENOTFOUND" || code?.startsWith("08") || code?.startsWith("57");
    console.error("[http] unhandled error:", err);
    if (dbDown) {
      res.status(503).json({ error: { code: "db_unavailable", message: "The service is temporarily unavailable. Please try again." } });
      return;
    }
    res.status(500).json({ error: { code: "internal", message: "Something went wrong on our side." } });
  });

  return app;
}
