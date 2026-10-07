import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CloudSun, Route as RouteIcon, Mountain, Repeat, AlertTriangle, Loader2 } from "lucide-react";
import IconPanel from "@/components/overlay/IconPanel";
import type { ConditionId } from "@/components/app/MapRail";
import { getWeather, type WeatherData } from "@/services/windService";
import { getRoadConditions, type RoadInfoResult } from "@/services/roadInfoService";
import { detectCurves } from "@/utils/geo";
import type { Coordinates, RouteResult } from "@/types";

const META: Record<ConditionId, { title: string; icon: ReactNode }> = {
  weather: { title: "Weather", icon: <CloudSun size={18} /> },
  roads: { title: "Road types", icon: <RouteIcon size={18} /> },
  terrain: { title: "Terrain", icon: <Mountain size={18} /> },
  curves: { title: "Curves", icon: <Repeat size={18} /> },
  alerts: { title: "Alerts", icon: <AlertTriangle size={18} /> },
};

interface ConditionPanelProps {
  id: ConditionId;
  coords: Coordinates | null;
  route: RouteResult | null;
  alerts: string[];
  onClose: () => void;
}

function Unavailable({ children }: { children: ReactNode }) {
  return <p className="icon-panel__unavailable">{children}</p>;
}

function WeatherContent({ coords }: { coords: Coordinates | null }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!coords) return;
    setLoading(true);
    getWeather(coords)
      .then(setWeather)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
    // fetch once per open; coords at open time are enough
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!coords) return <Unavailable>Enable location to see current weather.</Unavailable>;
  if (loading) {
    return (
      <p className="loading-msg">
        <Loader2 size={14} className="spin" /> Getting weather…
      </p>
    );
  }
  if (error) return <p className="error-msg">{error}</p>;
  return weather ? (
    <div className="cond-big">
      <strong>{weather.temperatureC}°C</strong>
      <span>{weather.description}</span>
    </div>
  ) : null;
}

function RoadContent({ route, kind }: { route: RouteResult | null; kind: "roads" | "terrain" }) {
  const [info, setInfo] = useState<RoadInfoResult | null>(null);
  useEffect(() => {
    getRoadConditions(route).then(setInfo);
  }, [route]);
  if (!route) return <Unavailable>Calculate a route to see what's ahead.</Unavailable>;
  if (!info) return null;
  if (info.status === "unavailable") return <Unavailable>Information unavailable — {info.reason}</Unavailable>;
  const lines =
    kind === "roads" ? (info.data.roadTypes ?? []).map((r) => `${r.label} — ${Math.round(r.km)} km`) : info.data.terrain ?? [];
  return lines.length > 0 ? (
    <ul className="icon-panel__alert-list">
      {lines.map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  ) : (
    <Unavailable>Information unavailable for this route.</Unavailable>
  );
}

export default function ConditionPanel({ id, coords, route, alerts, onClose }: ConditionPanelProps) {
  const curves = useMemo(() => (id === "curves" && route ? detectCurves(route.geometry) : []), [id, route]);
  const meta = META[id];

  return (
    <IconPanel title={meta.title} icon={meta.icon} onClose={onClose}>
      {id === "weather" && <WeatherContent coords={coords} />}
      {(id === "roads" || id === "terrain") && <RoadContent route={route} kind={id} />}
      {id === "curves" &&
        (!route ? (
          <Unavailable>Calculate a route to see curves ahead.</Unavailable>
        ) : curves.length === 0 ? (
          <p>No sharp curves detected on this route.</p>
        ) : (
          <div className="cond-big">
            <strong>{curves.length}</strong>
            <span>sharp curve{curves.length === 1 ? "" : "s"} along the route — measured from the actual route geometry.</span>
          </div>
        ))}
      {id === "alerts" &&
        (alerts.length > 0 ? (
          <ul className="icon-panel__alert-list">
            {alerts.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        ) : (
          <p>No active alerts.</p>
        ))}
    </IconPanel>
  );
}
