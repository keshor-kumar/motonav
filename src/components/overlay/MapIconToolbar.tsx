import { useState, type ReactNode } from "react";
import { Mountain, Route as RouteIcon, Repeat, CloudSun, Fuel, AlertTriangle, Dumbbell, Users, Loader2 } from "lucide-react";
import IconPanel from "@/components/overlay/IconPanel";
import { getWeather, type WeatherData } from "@/services/windService";
import { searchNearbyPlaces } from "@/services/placesService";
import { detectCurves } from "@/utils/geo";
import { formatDistanceMeters } from "@/utils/format";
import type { Coordinates, NearbyPlace } from "@/types";

type PanelId = "terrain" | "roads" | "curves" | "weather" | "fuel" | "alerts" | "warmup" | "riders";

interface MapIconToolbarProps {
  coords: Coordinates | null;
  routeGeometry?: [number, number][];
  /** Shown in the Alerts panel — whatever the dashboard currently has active (separation alert, GPS error, etc.). Optional. */
  activeAlerts?: string[];
  onOpenWarmup?: () => void;
  renderRidersPanel?: () => ReactNode;
}

const ICONS: { id: PanelId; label: string; icon: typeof Mountain }[] = [
  { id: "terrain", label: "Terrain", icon: Mountain },
  { id: "roads", label: "Roads", icon: RouteIcon },
  { id: "curves", label: "Curves", icon: Repeat },
  { id: "weather", label: "Weather", icon: CloudSun },
  { id: "fuel", label: "Fuel", icon: Fuel },
  { id: "alerts", label: "Alerts", icon: AlertTriangle },
  { id: "warmup", label: "Warm-up", icon: Dumbbell },
  { id: "riders", label: "Riders", icon: Users },
];

/**
 * The icon-first map overlay: a compact row of glass icon buttons. Tapping
 * one opens a bottom-sheet with that feature's info, then closes back to a
 * clean map — nothing stays permanently on screen except the icons
 * themselves and the wind strip (WindIndicator, rendered separately).
 */
export default function MapIconToolbar({ coords, routeGeometry = [], activeAlerts = [], onOpenWarmup, renderRidersPanel }: MapIconToolbarProps) {
  const [open, setOpen] = useState<PanelId | null>(null);
  const [fuelPlaces, setFuelPlaces] = useState<NearbyPlace[] | null>(null);
  const [fuelLoading, setFuelLoading] = useState(false);
  const [fuelError, setFuelError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  function handleOpen(id: PanelId) {
    if (id === "warmup" && onOpenWarmup) {
      onOpenWarmup();
      return;
    }
    setOpen(id);
    if (id === "fuel" && coords && !fuelPlaces && !fuelLoading) {
      setFuelLoading(true);
      setFuelError(null);
      searchNearbyPlaces("fuel", coords)
        .then(setFuelPlaces)
        .catch((err: Error) => setFuelError(err.message))
        .finally(() => setFuelLoading(false));
    }
    if (id === "weather" && coords && !weather && !weatherLoading) {
      setWeatherLoading(true);
      setWeatherError(null);
      getWeather(coords)
        .then(setWeather)
        .catch((err: Error) => setWeatherError(err.message))
        .finally(() => setWeatherLoading(false));
    }
  }

  const curves = routeGeometry.length > 0 ? detectCurves(routeGeometry) : [];
  const activePanel = ICONS.find((i) => i.id === open);

  return (
    <>
      <div className="map-icon-row">
        {ICONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`map-icon-btn ${id === "alerts" && activeAlerts.length > 0 ? "map-icon-btn--alert" : ""}`}
            onClick={() => handleOpen(id)}
          >
            <Icon size={18} strokeWidth={2} />
            <span className="map-icon-btn__label">{label}</span>
          </button>
        ))}
      </div>

      {activePanel && open !== "warmup" && (
        <IconPanel title={activePanel.label} icon={<activePanel.icon size={18} />} onClose={() => setOpen(null)}>
          {open === "terrain" && <p className="icon-panel__unavailable">Information unavailable — no terrain/elevation data source is wired up yet.</p>}
          {open === "roads" && <p className="icon-panel__unavailable">Information unavailable — the routing service in use doesn't return road-type breakdown yet.</p>}

          {open === "curves" &&
            (routeGeometry.length === 0 ? (
              <p className="icon-panel__unavailable">Calculate a route first to see curves ahead.</p>
            ) : curves.length === 0 ? (
              <p>No sharp curves detected on the current route.</p>
            ) : (
              <p>
                <strong>{curves.length}</strong> sharp curve{curves.length === 1 ? "" : "s"} detected along the current route (computed
                from the actual route geometry).
              </p>
            ))}

          {open === "weather" &&
            (weatherLoading ? (
              <p className="loading-msg">
                <Loader2 size={14} className="spin" /> Getting weather…
              </p>
            ) : weatherError ? (
              <p className="error-msg">{weatherError}</p>
            ) : weather ? (
              <p>
                <strong>{weather.temperatureC}°C</strong> — {weather.description}
              </p>
            ) : (
              <p className="icon-panel__unavailable">Enable location to see current weather.</p>
            ))}

          {open === "fuel" &&
            (fuelLoading ? (
              <p className="loading-msg">
                <Loader2 size={14} className="spin" /> Finding nearby fuel stations…
              </p>
            ) : fuelError ? (
              <p className="error-msg">{fuelError}</p>
            ) : fuelPlaces && fuelPlaces.length > 0 ? (
              <div className="nearby-panel__list">
                {fuelPlaces.slice(0, 5).map((p) => (
                  <div key={p.id} className="place-card">
                    <div className="place-card__row">
                      <div className="place-card__body">
                        <span className="place-card__name">{p.name}</span>
                        <span className="place-card__address">{p.address}</span>
                        <span className="place-card__meta">{formatDistanceMeters(p.distanceMeters)} away</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No nearby fuel stations found.</p>
            ))}

          {open === "alerts" &&
            (activeAlerts.length > 0 ? (
              <ul className="icon-panel__alert-list">
                {activeAlerts.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            ) : (
              <p>No active alerts.</p>
            ))}

          {open === "riders" && (renderRidersPanel ? renderRidersPanel() : <p className="icon-panel__unavailable">Join a group ride to see riders here.</p>)}
        </IconPanel>
      )}
    </>
  );
}
