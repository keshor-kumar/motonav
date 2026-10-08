import { useState } from "react";
import { ExternalLink, ImageOff } from "lucide-react";
import type { NewsArticle } from "@/services/newsService";

function timeAgo(iso: string): string {
  const t = Date.parse(iso);
  if (!t || t < 86_400_000) return "";
  const mins = Math.max(1, Math.round((Date.now() - t) / 60_000));
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  if (days < 8) return `${days} d ago`;
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function NewsCard({ article }: { article: NewsArticle }) {
  const [imgFailed, setImgFailed] = useState(false);
  const when = timeAgo(article.publishedAt);
  return (
    <article className="news-card">
      <div className="news-card__media">
        {article.image && !imgFailed ? (
          <img src={article.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setImgFailed(true)} />
        ) : (
          <div className="news-card__noimg" aria-hidden="true">
            <ImageOff size={28} />
          </div>
        )}
        <span className="news-card__cat">{article.category}</span>
      </div>
      <div className="news-card__body">
        <div className="news-card__meta">
          <span className="news-card__source">{article.source}</span>
          {when && <time dateTime={article.publishedAt}>{when}</time>}
        </div>
        <h2 className="news-card__title">{article.title}</h2>
        {article.description && <p className="news-card__desc">{article.description}</p>}
        <a className="btn btn--secondary btn--md news-card__cta" href={article.url} target="_blank" rel="noopener noreferrer">
          Read Article <ExternalLink size={15} aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

export function NewsCardSkeleton() {
  return (
    <div className="news-card news-card--skeleton" aria-hidden="true">
      <div className="news-card__media skel" />
      <div className="news-card__body">
        <div className="skel skel--line skel--short" />
        <div className="skel skel--line" />
        <div className="skel skel--line" />
        <div className="skel skel--line skel--short" />
      </div>
    </div>
  );
}
