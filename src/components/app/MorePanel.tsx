import { Link } from "react-router-dom";
import { Dumbbell, Droplet, Bell, BookOpen, Map as MapIcon, Newspaper, Users } from "lucide-react";
import SosButton from "@/components/app/SosButton";
import MusicPlayerBar from "@/components/music/MusicPlayerBar";

const THRESHOLDS = [
  { meters: 500, label: "500 m" },
  { meters: 1000, label: "1 km" },
  { meters: 2000, label: "2 km" },
  { meters: 3000, label: "3 km" },
];

interface MorePanelProps {
  onOpenWarmup: () => void;
  onOpenSignals: () => void;
  separationMeters: number;
  onSeparationChange: (meters: number) => void;
}

export default function MorePanel({ onOpenWarmup, onOpenSignals, separationMeters, onSeparationChange }: MorePanelProps) {
  return (
    <div className="panel-stack">
      <section className="more-block">
        <h3 className="more-block__title">Safety</h3>
        <SosButton />
      </section>

      <section className="more-block">
        <h3 className="more-block__title">Before you ride</h3>
        <button type="button" className="more-card" onClick={onOpenWarmup}>
          <Dumbbell size={22} />
          <span>
            <strong>Start warm-up</strong>
            <small>6 quick stretches · about 3 minutes</small>
          </span>
        </button>
        <button type="button" className="more-card" onClick={onOpenSignals}>
          <BookOpen size={22} />
          <span>
            <strong>Rider signals</strong>
            <small>Common hand signals for group riding</small>
          </span>
        </button>
        <div className="more-card more-card--static">
          <Droplet size={22} />
          <span>
            <strong>Hydrate &amp; check</strong>
            <small>Water, fuel, tyres, weather, route</small>
          </span>
        </div>
      </section>

      <section className="more-block">
        <h3 className="more-block__title">Explore</h3>
        <Link to="/community" className="more-card">
          <Users size={22} />
          <span>
            <strong>Moto Community</strong>
            <small>Text and voice chat with your riding crew</small>
          </span>
        </Link>
        <Link to="/routes" className="more-card">
          <MapIcon size={22} />
          <span>
            <strong>Famous rides</strong>
            <small>10 classic routes — start one in navigation</small>
          </span>
        </Link>
        <Link to="/news" className="more-card">
          <Newspaper size={22} />
          <span>
            <strong>Moto news</strong>
            <small>Launches, racing, adventure and more</small>
          </span>
        </Link>
      </section>

      <section className="more-block">
        <h3 className="more-block__title">Crew alerts</h3>
        <label className="more-card more-card--static more-card--field">
          <Bell size={22} />
          <span>
            <strong>Warn me when a rider is farther than</strong>
          </span>
          <select className="field-select" value={separationMeters} onChange={(e) => onSeparationChange(Number(e.target.value))}>
            {THRESHOLDS.map((t) => (
              <option key={t.meters} value={t.meters}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="more-block">
        <h3 className="more-block__title">Previews</h3>
        <MusicPlayerBar />
      </section>
    </div>
  );
}
