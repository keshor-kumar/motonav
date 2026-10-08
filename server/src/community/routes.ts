import express, { type NextFunction, type Request, type RequestHandler, type Response } from "express";
import { AppError } from "../types.js";
import type { CommunityService } from "./service.js";
import type { MemoryAudioStorage } from "./storage.js";
import { COMMUNITY_LIMITS } from "./validation.js";

const bearer = (req: Request): string | undefined => {
  const h = req.header("authorization");
  return h?.startsWith("Bearer ") ? h.slice(7) : undefined;
};
const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

export interface CommunityRouteDeps {
  service: CommunityService;
  /** Present only when Supabase Storage is NOT configured (dev fallback): serves audio from memory. */
  memoryAudio: MemoryAudioStorage | null;
  rateLimit: (max: number) => RequestHandler;
}

/** REST surface for Moto Community. Mounted at /api/community. Existing ride routes are untouched. */
export function communityRouter({ service, memoryAudio, rateLimit }: CommunityRouteDeps) {
  const r = express.Router();

  r.post("/", rateLimit(10), wrap(async (req, res) => {
    res.status(201).json(await service.create(req.body));
  }));

  // Dev-only audio fallback (unguessable path; Supabase deployments never use this).
  r.get("/audio/:cid/:file", rateLimit(240), (req, res, next) => {
    const f = memoryAudio?.get(`${req.params.cid}/${req.params.file}`);
    if (!f) return next(new AppError("not_found", 404, "Not found."));
    res.setHeader("Content-Type", f.contentType);
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(f.data);
  });

  r.get("/:code", rateLimit(120), wrap(async (req, res) => {
    res.json(await service.getPublicInfo(req.params.code));
  }));

  r.post("/:code/join", rateLimit(30), wrap(async (req, res) => {
    res.json(await service.join(req.params.code, req.body, bearer(req)));
  }));

  r.get("/:code/session", rateLimit(120), wrap(async (req, res) => {
    res.json(await service.getSession(bearer(req), req.params.code));
  }));

  r.get("/:code/messages", rateLimit(240), wrap(async (req, res) => {
    res.json(await service.listMessages(bearer(req), req.params.code, req.query.before, req.query.limit));
  }));

  // Fresh playable URL for one voice message (membership-checked; the DB stores only the object path).
  r.get("/:code/messages/:id/audio-url", rateLimit(240), wrap(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(await service.getAudioUrl(bearer(req), req.params.code, req.params.id));
  }));

  // HTTP fallback for text (the app normally sends over the socket).
  r.post("/:code/messages", rateLimit(60), wrap(async (req, res) => {
    const { community, member } = await service.authorize(bearer(req), req.params.code);
    const text = (req.body as { text?: unknown } | null)?.text;
    res.status(201).json({ message: await service.sendText({ communityId: community.id, memberId: member.id }, text) });
  }));

  // Voice message upload: raw audio bytes in the body, duration in a header. Auth + membership first,
  // then size/format checks, then Supabase Storage, then DB row, then the socket broadcast (metadata + URL only).
  const authenticate: RequestHandler = (req, res, next) => {
    service
      .authorize(bearer(req), req.params.code)
      .then(({ community, member }) => {
        res.locals.ctx = { communityId: community.id, memberId: member.id };
        next();
      })
      .catch(next);
  };
  r.post(
    "/:code/audio",
    rateLimit(30),
    authenticate, // authenticate BEFORE buffering the body, so anonymous clients can't make us read 2 MB
    express.raw({ type: () => true, limit: COMMUNITY_LIMITS.audioMaxBytes }),
    wrap(async (req, res) => {
      const message = await service.sendAudio(res.locals.ctx, {
        data: req.body as Buffer,
        contentType: req.header("content-type"),
        durationMs: req.header("x-audio-duration-ms"),
      });
      res.status(201).json({ message });
    })
  );

  return r;
}
