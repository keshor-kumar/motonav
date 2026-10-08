import { AppError } from "./types.js";

export const NEWS_CATEGORIES = [
  "Latest",
  "New Bikes",
  "MotoGP/Racing",
  "Adventure/Touring",
  "EV Motorcycles",
  "Motorcycle Technology",
  "Safety",
  "India/Local",
] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export interface NewsArticle {
  title: string;
  description: string;
  image: string | null;
  publishedAt: string;
  source: string;
  url: string;
  category: NewsCategory;
}

export interface NewsResult {
  articles: NewsArticle[];
  fetchedAt: string;
  /** true when the upstream API failed and an older cached copy is being served. */
  stale: boolean;
}

/** The search terms from the product spec, OR-ed into one upstream query (one request = quota-friendly). */
export const NEWS_QUERY =
  '(motorcycle OR motorbike OR "bike launch" OR "motorcycle racing" OR MotoGP OR "adventure motorcycle" OR "touring motorcycle" OR "electric motorcycle" OR "India motorcycle")';

// Order matters: first matching rule wins, anything unmatched stays "Latest".
const RULES: Array<[NewsCategory, RegExp]> = [
  ["Safety", /\b(safety|helmet|crash|accident|recall|abs\b|airbag|rider (?:death|killed|injur)|road safety|riding gear|protective)/i],
  ["MotoGP/Racing", /\b(motogp|moto2|moto3|superbike|wsbk|world superbike|grand prix|isle of man|tt race|motocross|supercross|dakar|racing|race win|podium|qualifying)\b/i],
  ["EV Motorcycles", /\b(electric (?:motorcycle|motorbike|bike|scooter)|e-?bike|ev motorcycle|zero motorcycles|ultraviolette|revolt|ather|livewire|battery[- ]powered)\b/i],
  ["New Bikes", /\b(launch(?:ed|es)?|unveil(?:ed|s)?|debut|new .{0,20}(?:model|bike|motorcycle)|price (?:revealed|announced)|first look|revealed|2026 .{0,25}|2027 .{0,25}|teaser|goes on sale)\b/i],
  ["Adventure/Touring", /\b(adventure|touring|himalayan|africa twin|gs\b|multistrada|tenere|ténéré|road trip|long[- ]distance|overland|rally raid)\b/i],
  ["Motorcycle Technology", /\b(technology|tech\b|engine|traction control|radar|quickshifter|electronics|suspension|tyre|tire|turbo|supercharg|fuel injection|ride[- ]by[- ]wire|connectivity|ai\b)\b/i],
];
const INDIA = /\b(india|indian|royal enfield|bajaj|tvs|hero motocorp|ktm india|mumbai|delhi|chennai|bengaluru|bangalore|hyderabad|pune|kerala|ladakh|lakh)\b|₹|\brs\.? ?\d/i;

export function categorize(title: string, description: string): NewsCategory {
  const text = `${title} ${description}`;
  for (const [cat, re] of RULES) if (re.test(text)) return cat;
  if (INDIA.test(text)) return "India/Local";
  return "Latest";
}

const safeHttpUrl = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
};

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
const plain = (s: unknown) =>
  typeof s === "string" ? s.replace(/<[^>]*>/g, " ").replace(/\[\+\d+ chars\]$/, "").replace(/\s+/g, " ").trim() : "";

/** Normalise NewsAPI.org `articles[]` into MotoNav's shape. Drops unusable rows and duplicates. */
export function normalizeArticles(raw: unknown): NewsArticle[] {
  const list = (raw as { articles?: unknown[] } | null)?.articles;
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: NewsArticle[] = [];
  for (const item of list) {
    const a = item as Record<string, unknown> | null;
    if (!a) continue;
    const title = plain(a.title);
    const url = safeHttpUrl(a.url);
    if (!title || !url || /\[removed\]/i.test(title)) continue;
    const key = url.replace(/[?#].*$/, "") || title.toLowerCase();
    const tkey = title.toLowerCase();
    if (seen.has(key) || seen.has(tkey)) continue;
    seen.add(key);
    seen.add(tkey);
    const description = clip(plain(a.description) || plain(a.content), 220);
    if (/\[removed\]/i.test(description)) continue;
    const when = typeof a.publishedAt === "string" ? Date.parse(a.publishedAt) : NaN;
    out.push({
      title: clip(title, 200),
      description,
      image: safeHttpUrl(a.urlToImage),
      publishedAt: Number.isNaN(when) ? new Date(0).toISOString() : new Date(when).toISOString(),
      source: plain((a.source as { name?: unknown } | undefined)?.name) || "News",
      url,
      category: categorize(title, description),
    });
  }
  return out.sort((x, y) => (x.publishedAt < y.publishedAt ? 1 : -1));
}

export interface NewsServiceOptions {
  apiKey: string | undefined;
  baseUrl?: string;
  ttlMs?: number;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

/**
 * Server-side news proxy. The NEWS_API_KEY never leaves this process; the browser only ever talks to
 * GET /api/news/motorcycle. Results are cached (default 15 min) to protect the provider's quota, and a
 * stale copy is served if the provider is briefly down.
 */
export class NewsService {
  private cache: { at: number; articles: NewsArticle[] } | null = null;
  private inflight: Promise<NewsArticle[]> | null = null;
  private readonly ttl: number;
  private readonly f: typeof fetch;
  private readonly now: () => number;
  private readonly base: string;

  constructor(private readonly o: NewsServiceOptions) {
    this.ttl = o.ttlMs ?? 15 * 60_000;
    this.f = o.fetchImpl ?? fetch;
    this.now = o.now ?? (() => Date.now());
    this.base = (o.baseUrl || "https://newsapi.org/v2").replace(/\/+$/, "");
  }

  get configured() {
    return Boolean(this.o.apiKey);
  }

  async get(opts: { category?: string; force?: boolean } = {}): Promise<NewsResult> {
    if (!this.o.apiKey)
      throw new AppError("not_configured", 503, "The news service isn't configured yet (NEWS_API_KEY is missing on the server).");

    const fresh = this.cache && this.now() - this.cache.at < this.ttl;
    let stale = false;
    if (!fresh || opts.force) {
      // "refresh" is rate-limited by a 60 s floor so the button can't burn the provider quota.
      const recentlyFetched = this.cache && this.now() - this.cache.at < 60_000;
      if (!(opts.force && recentlyFetched)) {
        try {
          this.inflight ??= this.fetchUpstream().finally(() => (this.inflight = null));
          const articles = await this.inflight;
          this.cache = { at: this.now(), articles };
        } catch (err) {
          if (!this.cache) throw err;
          stale = true;
          console.error("[news] upstream failed, serving cached copy:", (err as Error).message);
        }
      }
    }
    const cache = this.cache!;
    const category = NEWS_CATEGORIES.find((c) => c.toLowerCase() === (opts.category ?? "").toLowerCase());
    const articles = !category || category === "Latest" ? cache.articles : cache.articles.filter((a) => a.category === category);
    return { articles, fetchedAt: new Date(cache.at).toISOString(), stale };
  }

  private async fetchUpstream(): Promise<NewsArticle[]> {
    const url = new URL(`${this.base}/everything`);
    url.searchParams.set("q", NEWS_QUERY);
    url.searchParams.set("language", "en");
    url.searchParams.set("sortBy", "publishedAt");
    url.searchParams.set("pageSize", "60");
    let res: Response;
    try {
      res = await this.f(url, { headers: { "X-Api-Key": this.o.apiKey!, Accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
    } catch (err) {
      throw new AppError("upstream_unavailable", 502, `Couldn't reach the news provider (${(err as Error).name}).`);
    }
    if (!res.ok) {
      // Never forward the provider's body/headers; log status only (the key is in a header, not the URL).
      console.error(`[news] provider responded ${res.status}`);
      const msg =
        res.status === 401 || res.status === 403
          ? "The news provider rejected the server's API key."
          : res.status === 429
            ? "The news provider's request limit was reached. Try again later."
            : "The news provider is having trouble right now.";
      throw new AppError("upstream_unavailable", 502, msg);
    }
    const body = (await res.json().catch(() => null)) as unknown;
    return normalizeArticles(body);
  }
}
