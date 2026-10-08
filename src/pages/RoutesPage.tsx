import { useMemo, useState } from "react";
import { Bookmark } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import RouteCard from "@/components/rides/RouteCard";
import { FAMOUS_ROUTES, type Difficulty } from "@/data/famousRoutes";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useStartRoute } from "@/hooks/useStartRoute";

type Filter = "All" | Difficulty;
const FILTERS: Filter[] = ["All", "Easy", "Moderate", "Hard"];

export default function RoutesPage() {
  const { saved, isSaved, toggle } = useBookmarks();
  const start = useStartRoute();
  const [filter, setFilter] = useState<Filter>("All");
  const [onlySaved, setOnlySaved] = useState(false);

  const visible = useMemo(
    () => FAMOUS_ROUTES.filter((r) => (filter === "All" || r.difficulty === filter) && (!onlySaved || saved.includes(r.id))),
    [filter, onlySaved, saved]
  );

  return (
    <PageShell
      title="Famous Rides"
      lede="Ten classic Indian motorcycle routes. View a ride for the full map and notes, or start it straight in MotoNav navigation."
    >
      <div className="chips" role="group" aria-label="Filter rides">
        {FILTERS.map((f) => (
          <button key={f} type="button" className={`chip ${filter === f ? "chip--active" : ""}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
        <button type="button" className={`chip ${onlySaved ? "chip--active" : ""}`} aria-pressed={onlySaved} onClick={() => setOnlySaved((v) => !v)}>
          <Bookmark size={14} aria-hidden="true" /> Saved{saved.length ? ` (${saved.length})` : ""}
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="state-card">
          <Bookmark size={28} aria-hidden="true" />
          <h2>{onlySaved ? "No saved rides yet" : "No rides match that filter"}</h2>
          <p>{onlySaved ? "Tap the bookmark on a ride to keep it here." : "Try a different difficulty."}</p>
          <button type="button" className="btn btn--secondary btn--md" onClick={() => { setFilter("All"); setOnlySaved(false); }}>
            Show all rides
          </button>
        </div>
      ) : (
        <div className="ride-grid">
          {visible.map((r) => (
            <RouteCard key={r.id} route={r} saved={isSaved(r.id)} onToggleSave={toggle} onStart={start} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
