import { request } from "@/services/groupRideService";

// Moto News comes from MotoNav's own backend (GET /api/news/motorcycle). The news provider's API key
// lives only on the server — the browser never talks to the provider and never sees a key.

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

export interface NewsFeed {
  articles: NewsArticle[];
  fetchedAt: string;
  stale: boolean;
}

export function fetchMotorcycleNews(opts: { category?: NewsCategory; refresh?: boolean } = {}): Promise<NewsFeed> {
  const q = new URLSearchParams();
  if (opts.category && opts.category !== "Latest") q.set("category", opts.category);
  if (opts.refresh) q.set("refresh", "1");
  const qs = q.toString();
  return request<NewsFeed>(`/api/news/motorcycle${qs ? `?${qs}` : ""}`);
}
