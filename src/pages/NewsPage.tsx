import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Newspaper, RefreshCw } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import NewsCard, { NewsCardSkeleton } from "@/components/news/NewsCard";
import { fetchMotorcycleNews, NEWS_CATEGORIES, type NewsArticle, type NewsCategory } from "@/services/newsService";

type LoadState = { kind: "loading" } | { kind: "ready" } | { kind: "error"; message: string };

export default function NewsPage() {
  const [category, setCategory] = useState<NewsCategory>("Latest");
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [stale, setStale] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const reqId = useRef(0);

  const load = useCallback(async (cat: NewsCategory, refresh = false) => {
    const id = ++reqId.current;
    if (refresh) setRefreshing(true);
    else setState({ kind: "loading" });
    try {
      const feed = await fetchMotorcycleNews({ category: cat, refresh });
      if (id !== reqId.current) return; // a newer request superseded this one
      setArticles(feed.articles);
      setStale(feed.stale);
      setState({ kind: "ready" });
    } catch (err) {
      if (id !== reqId.current) return;
      setState({ kind: "error", message: err instanceof Error ? err.message : "Couldn't load the news." });
    } finally {
      if (id === reqId.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(category);
  }, [category, load]);

  return (
    <PageShell
      title="Moto News"
      lede="Fresh motorcycle headlines — launches, racing, adventure and more. Tap Read Article to open the original publisher."
      actions={
        <button type="button" className="btn btn--secondary btn--md" onClick={() => void load(category, true)} disabled={refreshing || state.kind === "loading"}>
          <RefreshCw size={16} className={refreshing ? "spin" : ""} aria-hidden="true" /> Refresh
        </button>
      }
    >
      <div className="chips" role="tablist" aria-label="News categories">
        {NEWS_CATEGORIES.map((c) => (
          <button key={c} type="button" role="tab" aria-selected={c === category} className={`chip ${c === category ? "chip--active" : ""}`} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>

      {stale && state.kind === "ready" && (
        <p className="note note--warn" role="status">
          <AlertTriangle size={15} aria-hidden="true" /> Showing saved headlines — the news provider couldn't be reached just now.
        </p>
      )}

      {state.kind === "loading" && (
        <div className="news-grid" aria-busy="true" aria-label="Loading news">
          {Array.from({ length: 6 }, (_, i) => (
            <NewsCardSkeleton key={i} />
          ))}
        </div>
      )}

      {state.kind === "error" && (
        <div className="state-card" role="alert">
          <AlertTriangle size={28} aria-hidden="true" />
          <h2>Couldn't load the news</h2>
          <p>{state.message}</p>
          <button type="button" className="btn btn--primary btn--md" onClick={() => void load(category)}>
            <RefreshCw size={16} aria-hidden="true" /> Try again
          </button>
        </div>
      )}

      {state.kind === "ready" && articles.length === 0 && (
        <div className="state-card">
          <Newspaper size={28} aria-hidden="true" />
          <h2>No stories in {category} right now</h2>
          <p>{category === "Latest" ? "Check back in a little while." : "Try another category, or see everything under Latest."}</p>
          {category !== "Latest" && (
            <button type="button" className="btn btn--secondary btn--md" onClick={() => setCategory("Latest")}>
              Show Latest
            </button>
          )}
        </div>
      )}

      {state.kind === "ready" && articles.length > 0 && (
        <div className="news-grid">
          {articles.map((a) => (
            <NewsCard key={a.url} article={a} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
