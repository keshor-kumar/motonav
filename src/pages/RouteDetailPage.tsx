import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Bookmark, BookmarkCheck, ChevronLeft, Clock, Flag, Gauge, Info, Mountain, Navigation, Route as RouteIcon, ShieldAlert, Sun } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import MapView from "@/components/map/MapView";
import { getFamousRoute } from "@/data/famousRoutes";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useStartRoute } from "@/hooks/useStartRoute";
import { hasGeoapifyKey } from "@/config/env";
import { getRoute } from "@/services/routingService";
import { formatDistanceMeters, formatDurationSeconds } from "@/utils/format";
import type { RouteResult } from "@/types";

// Road routes already fetched this session, so revisiting a ride (or flipping between rides) is instant.
const routeCache = new Map<string, RouteResult>();

type LiveState = "idle" | "loading" | "ready" | "failed";

export default function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const route = getFamousRoute(id);
  const { isSaved, toggle } = useBookmarks();
  const start = useStartRoute();

  const [live, setLive] = useState<RouteResult | null>(route ? routeCache.get(route.id) ?? null : null);
  const [liveState, setLiveState] = useState<LiveState>(live ? "ready" : "idle");

  useEffect(() => {
    if (!route) return;
    const cached = routeCache.get(route.id);
    if (cached) {
      setLive(cached);
      setLiveState("ready");
      return;
    }
    if (!hasGeoapifyKey) {
      setLive(null);
      setLiveState("failed");
      return;
    }
    let cancelled = false;
    setLive(null);
    setLiveState("loading");
    getRoute(route.start.coords, route.destination.coords)
      .then((r) => {
        if (cancelled) return;
        routeCache.set(route.id, r);
        setLive(r);
        setLiveState("ready");
      })
      .catch(() => !cancelled && setLiveState("failed"));
    return () => {
      cancelled = true;
    };
  }, [route]);

  const geometry = useMemo<[number, number][]>(() => live?.geometry ?? route?.waypoints ?? [], [live, route]);

  if (!route) {
    return (
      <PageShell title="Ride not found">
        <div className="state-card">
          <Info size={28} aria-hidden="true" />
          <h2>We couldn't find that ride</h2>
          <p>It may have been removed or the link is mistyped.</p>
          <Link to="/routes" className="btn btn--primary btn--md">Back to Famous Rides</Link>
        </div>
      </PageShell>
    );
  }

  const saved = isSaved(route.id);

  return (
    <PageShell>
      <Link to="/routes" className="back-link">
        <ChevronLeft size={16} aria-hidden="true" /> All rides
      </Link>

      <section className="rd-hero">
        <img src={route.image} alt="" decoding="async" />
        <div className="rd-hero__scrim" />
        <div className="rd-hero__text">
          <span className={`diff diff--${route.difficulty.toLowerCase()}`}>{route.difficulty}</span>
          <h1>{route.name}</h1>
          <p>{route.region}</p>
        </div>
      </section>

      <div className="rd-actions">
        <button type="button" className="btn btn--primary btn--lg" onClick={() => start(route)}>
          <Navigation size={18} aria-hidden="true" /> Start This Route
        </button>
        <button type="button" className="btn btn--secondary btn--lg" onClick={() => toggle(route.id)} aria-pressed={saved}>
          {saved ? <BookmarkCheck size={18} aria-hidden="true" /> : <Bookmark size={18} aria-hidden="true" />} {saved ? "Saved" : "Save ride"}
        </button>
      </div>

      <section className="rd-map" aria-label="Route map">
        <MapView
          origin={route.start.coords}
          destination={route.destination.coords}
          routeGeometry={geometry}
          fitRoute
          cooperativeGestures
          heightClassName="rd-map__view"
        />
        <p className="rd-map__note">
          {liveState === "loading" && "Calculating the road route…"}
          {liveState === "ready" && live && `Live road route: ${formatDistanceMeters(live.distanceMeters)} · ${formatDurationSeconds(live.durationSeconds)} (excluding stops).`}
          {liveState === "failed" && "Showing the curated route line. Live road distance isn't available right now."}
        </p>
      </section>

      <dl className="rd-stats">
        <div><dt><Flag size={15} aria-hidden="true" /> Start</dt><dd>{route.start.name}</dd></div>
        <div><dt><Flag size={15} aria-hidden="true" /> Destination</dt><dd>{route.destination.name}</dd></div>
        <div><dt><RouteIcon size={15} aria-hidden="true" /> Distance</dt><dd>≈ {route.distanceKm} km</dd></div>
        <div><dt><Clock size={15} aria-hidden="true" /> Ride time</dt><dd>{route.durationLabel}</dd></div>
        <div><dt><Gauge size={15} aria-hidden="true" /> Difficulty</dt><dd>{route.difficulty}</dd></div>
        <div><dt><Mountain size={15} aria-hidden="true" /> Terrain</dt><dd>{route.terrain.join(" · ")}</dd></div>
        <div><dt><Sun size={15} aria-hidden="true" /> Best season</dt><dd>{route.bestSeason}</dd></div>
        <div><dt><Clock size={15} aria-hidden="true" /> Suggested</dt><dd>{route.suggestedDays}</dd></div>
      </dl>

      <section className="rd-section">
        <h2>About this ride</h2>
        <p>{route.description}</p>
      </section>

      <section className="rd-section">
        <h2>Highlights</h2>
        <ul className="rd-list">
          {route.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </section>

      <section className="rd-section rd-section--notes">
        <h2><ShieldAlert size={18} aria-hidden="true" /> Rider notes</h2>
        <ul className="rd-list">
          {route.riderNotes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <p className="rd-fine">Distances and times are approximate planning figures. Conditions, permits and pass openings change — confirm before you ride.</p>
      </section>

      <div className="rd-actions rd-actions--bottom">
        <button type="button" className="btn btn--primary btn--lg btn--full" onClick={() => start(route)}>
          <Navigation size={18} aria-hidden="true" /> Start This Route
        </button>
      </div>
    </PageShell>
  );
}
