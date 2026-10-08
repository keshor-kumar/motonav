import { Link } from "react-router-dom";
import { Bookmark, BookmarkCheck, Clock, Flag, Mountain, Route as RouteIcon, Sun } from "lucide-react";
import RouteTrace from "@/components/rides/RouteTrace";
import type { FamousRoute } from "@/data/famousRoutes";

interface RouteCardProps {
  route: FamousRoute;
  saved: boolean;
  onToggleSave: (id: string) => void;
  onStart: (route: FamousRoute) => void;
}

export default function RouteCard({ route, saved, onToggleSave, onStart }: RouteCardProps) {
  return (
    <article className="ride-card">
      <div className="ride-card__media">
        <img src={route.image} alt="" loading="lazy" decoding="async" />
        <div className="ride-card__scrim" />
        <span className={`diff diff--${route.difficulty.toLowerCase()}`}>{route.difficulty}</span>
        <button
          type="button"
          className={`ride-card__save ${saved ? "ride-card__save--on" : ""}`}
          onClick={() => onToggleSave(route.id)}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${route.name} from saved rides` : `Save ${route.name}`}
        >
          {saved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
        </button>
        <div className="ride-card__title">
          <h2>{route.name}</h2>
          <p>{route.region}</p>
        </div>
      </div>

      <div className="ride-card__map">
        <RouteTrace points={route.waypoints} label={`Route line from ${route.start.name} to ${route.destination.name}`} />
        <span className="ride-card__map-tag">Route preview</span>
      </div>

      <div className="ride-card__body">
        <p className="ride-card__path">
          <span>{route.start.name}</span>
          <Flag size={13} aria-hidden="true" />
          <span>{route.destination.name}</span>
        </p>
        <dl className="ride-card__stats">
          <div>
            <dt><RouteIcon size={14} aria-hidden="true" /> Distance</dt>
            <dd>≈ {route.distanceKm} km</dd>
          </div>
          <div>
            <dt><Clock size={14} aria-hidden="true" /> Ride time</dt>
            <dd>{route.durationLabel}</dd>
          </div>
          <div>
            <dt><Mountain size={14} aria-hidden="true" /> Terrain</dt>
            <dd>{route.terrain.join(" · ")}</dd>
          </div>
          <div>
            <dt><Sun size={14} aria-hidden="true" /> Best season</dt>
            <dd>{route.bestSeason}</dd>
          </div>
        </dl>
        <p className="ride-card__desc">{route.description}</p>
        <div className="ride-card__actions">
          <Link to={`/routes/${route.id}`} className="btn btn--secondary btn--md">
            View Ride
          </Link>
          <button type="button" className="btn btn--primary btn--md" onClick={() => onStart(route)}>
            Start This Route
          </button>
        </div>
      </div>
    </article>
  );
}
