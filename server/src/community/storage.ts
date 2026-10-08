import { AppError } from "../types.js";

/**
 * Audio object storage. Production uses a PRIVATE Supabase Storage bucket ("community-audio");
 * the service-role key lives only on this server and is never sent to a browser. Objects are
 * handed to clients as short-lived signed URLs.
 */
export interface AudioStorage {
  put(path: string, data: Buffer, contentType: string): Promise<void>;
  /** A URL the browser can play. Absolute for Supabase; an API-relative path for the dev fallback. */
  signedUrl(path: string): Promise<string>;
}

export const SIGNED_URL_TTL_SECONDS = 60 * 60;

export interface SupabaseStorageOptions {
  url: string; // https://<project>.supabase.co
  serviceRoleKey: string;
  bucket: string;
  fetchImpl?: typeof fetch;
}

export class SupabaseAudioStorage implements AudioStorage {
  private readonly base: string;
  private readonly f: typeof fetch;
  constructor(private readonly o: SupabaseStorageOptions) {
    this.base = o.url.replace(/\/+$/, "") + "/storage/v1";
    this.f = o.fetchImpl ?? fetch;
  }
  private headers(extra: Record<string, string> = {}) {
    return { Authorization: `Bearer ${this.o.serviceRoleKey}`, apikey: this.o.serviceRoleKey, ...extra };
  }
  private enc = (p: string) => p.split("/").map(encodeURIComponent).join("/");

  async put(path: string, data: Buffer, contentType: string) {
    let res: Response;
    try {
      res = await this.f(`${this.base}/object/${encodeURIComponent(this.o.bucket)}/${this.enc(path)}`, {
        method: "POST",
        headers: this.headers({ "Content-Type": contentType, "x-upsert": "false" }),
        body: new Uint8Array(data), // copy into a plain ArrayBuffer-backed view (valid fetch BodyInit on every TS/Node typing)
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      console.error("[storage] upload request failed:", (err as Error).message);
      throw new AppError("storage_unavailable", 503, "Audio storage is unreachable right now. Please try again.");
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[storage] upload rejected (${res.status}): ${detail.slice(0, 300)}`);
      // 404 usually means the bucket doesn't exist — an operator error, not the rider's.
      throw new AppError("storage_unavailable", 503, "Audio storage isn't available right now. Please try again later.");
    }
  }

  async signedUrl(path: string) {
    const res = await this.f(`${this.base}/object/sign/${encodeURIComponent(this.o.bucket)}/${this.enc(path)}`, {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ expiresIn: SIGNED_URL_TTL_SECONDS }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new AppError("storage_unavailable", 503, "Couldn't prepare the audio for playback.");
    const body = (await res.json()) as { signedURL?: string; signedUrl?: string };
    const rel = body.signedURL ?? body.signedUrl;
    if (!rel) throw new AppError("storage_unavailable", 503, "Couldn't prepare the audio for playback.");
    if (/^https?:\/\//i.test(rel)) return rel;
    // Supabase returns "/object/sign/<bucket>/<path>?token=..." relative to /storage/v1.
    return `${this.base}${rel.startsWith("/") ? "" : "/"}${rel}`;
  }
}

/** Dev/test fallback when Supabase Storage isn't configured: bytes live in memory, served by the API. */
export class MemoryAudioStorage implements AudioStorage {
  files = new Map<string, { data: Buffer; contentType: string }>();
  async put(path: string, data: Buffer, contentType: string) {
    this.files.set(path, { data, contentType });
  }
  async signedUrl(path: string) {
    return `/api/community/audio/${path}`;
  }
  get(path: string) {
    return this.files.get(path) ?? null;
  }
}
