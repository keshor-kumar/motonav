import { useEffect, useState, type ReactNode } from "react";
import { Wind, CloudSun, Route as RouteIcon, Mountain, Repeat, Fuel, AlertTriangle, LocateFixed, Loader2 } from "lucide-react";
import Reveal from "@/components/landing/Reveal";
import { useGeolocation } from "@/hooks/useGeolocation";
import { getWind, getWeather, toCompassLabel, type WindData, type WeatherData } from "@/services/windService";

interface CardProps {
  icon: ReactNode;
  title: string;
  value: string;
  detail: string;
  tag: string;
  live?: boolean;
}

function ConditionCard({ icon, title, value, detail, tag, live = false }: CardProps) {
  return (
    <article className={`lp-cond ${live ? "lp-cond--live" : ""}`}>
      <div className="lp-cond__top">
        <span className="lp-cond__icon">{icon}</span>
        <span className="lp-cond__tag">{tag}</span>
      </div>
      <h3>{title}</h3>
      <p className="lp-cond__value">{value}</p>
      <p className="lp-cond__detail">{detail}</p>
    </article>
  );
}

export default function ConditionsSection() {
  const geo = useGeolocation();
  const [wind, setWind] = useState<WindData | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only after the visitor taps the button — never an automatic location prompt on the landing page.
  useEffect(() => {
    if (!geo.coords) return;
    setLoading(true);
    setError(null);
    Promise.all([getWind(geo.coords), getWeather(geo.coords)])
      .then(([w, wx]) => {
        setWind(w);
        setWeather(wx);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [geo.coords]);

  const locating = geo.status === "requesting" || loading;
  const problem = error ?? (geo.status === "denied" || geo.status === "unavailable" ? geo.error?.message ?? null : null);

  return (
    <section id="conditions" className="lp-section lp-conditions">
      <div className="lp-container">
        <Reveal className="lp-center">
          <span className="lp-eyebrow">Ride conditions</span>
          <h2 className="lp-h2">Know What's Ahead.</h2>
          <p className="lp-lead">Wind, weather and the shape of the road — one tap each, never cluttering the map.</p>
          <button type="button" className="btn btn--secondary btn--md" onClick={geo.requestLocation} disabled={locating}>
            {locating ? <Loader2 size={16} className="spin" /> : <LocateFixed size={16} />} Check live conditions here
          </button>
          {problem && <p className="error-msg lp-cond-error">{problem}</p>}
        </Reveal>

        <div className="lp-cond-grid">
          <Reveal>
            <ConditionCard
              icon={<Wind size={20} />}
              title="Wind"
              value={wind ? `${wind.speedKph} km/h` : "18 km/h"}
              detail={wind ? `${toCompassLabel(wind.directionDeg)} · gusts ${wind.gustKph} km/h` : "SW · gusts 31 km/h"}
              tag={wind ? "Live" : "Sample"}
              live={Boolean(wind)}
            />
          </Reveal>
          <Reveal delay={60}>
            <ConditionCard
              icon={<CloudSun size={20} />}
              title="Weather"
              value={weather ? `${weather.temperatureC}°C` : "24°C"}
              detail={weather ? weather.description : "Clear"}
              tag={weather ? "Live" : "Sample"}
              live={Boolean(weather)}
            />
          </Reveal>
          <Reveal delay={120}>
            <ConditionCard icon={<RouteIcon size={20} />} title="Road" value="Road types" detail="Highway, rural, narrow — shown once road data is connected." tag="Coming" />
          </Reveal>
          <Reveal delay={180}>
            <ConditionCard icon={<Mountain size={20} />} title="Terrain" value="Hills & climbs" detail="Elevation and steep sections — shown once terrain data is connected." tag="Coming" />
          </Reveal>
          <Reveal delay={240}>
            <ConditionCard icon={<Repeat size={20} />} title="Curves" value="Measured" detail="Sharp curves counted from your route's real geometry." tag="On your route" />
          </Reveal>
          <Reveal delay={300}>
            <ConditionCard icon={<Fuel size={20} />} title="Fuel" value="Nearby" detail="Stations around your live position, nearest first." tag="On demand" />
          </Reveal>
          <Reveal delay={360}>
            <ConditionCard icon={<AlertTriangle size={20} />} title="Alerts" value="Crew alerts" detail="A warning when a rider drifts too far from the group." tag="In rides" />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
