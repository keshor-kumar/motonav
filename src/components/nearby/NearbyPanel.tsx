import { Loader2, AlertCircle, Compass } from "lucide-react";
import Card from "@/components/common/Card";
import MapView from "@/components/map/MapView";
import PlaceCard from "@/components/nearby/PlaceCard";
import LocationPermissionButton from "@/components/navigation/LocationPermissionButton";
import { NEARBY_CATEGORY_META, NEARBY_CATEGORY_ORDER } from "@/components/nearby/categoryMeta";
import { useNearbyPlaces } from "@/hooks/useNearbyPlaces";
import type { NearbyPlace } from "@/types";

interface NearbyPanelProps {
  /** Hands a selected place off to the route planner as the new destination. */
  onNavigateHere?: (place: NearbyPlace) => void;
}

/**
 * Real nearby places (Geoapify Places API) searched around the rider's
 * actual current GPS position — no mock/sample data. Map + category grid +
 * result list all stay in sync: picking a category fetches real places,
 * selecting a result highlights its marker, and "Navigate here" hands the
 * place off as a destination.
 */
export default function NearbyPanel({ onNavigateHere }: NearbyPanelProps) {
  const { geo, activeCategory, places, selectedId, setSelectedId, status, errorMessage, selectCategory } =
    useNearbyPlaces();

  return (
    <Card className="nearby-panel">
      <div className="panel-header">
        <div className="panel-header__title">
          <Compass size={18} />
          <h3>Nearby</h3>
        </div>
      </div>

      {!geo.coords && (
        <div className="nearby-panel__geo">
          <LocationPermissionButton status={geo.status} onRequest={geo.requestLocation} />
        </div>
      )}

      <div className="nearby-panel__categories" role="tablist" aria-label="Nearby category">
        {NEARBY_CATEGORY_ORDER.map((cat) => {
          const meta = NEARBY_CATEGORY_META[cat];
          return (
            <button
              key={cat}
              className={`nearby-chip ${activeCategory === cat ? "nearby-chip--active" : ""}`}
              onClick={() => selectCategory(cat)}
              role="tab"
              aria-selected={activeCategory === cat}
            >
              <span className="nearby-chip__emoji">{meta.emoji}</span>
              <span>{meta.label}</span>
            </button>
          );
        })}
      </div>

      {activeCategory && (status === "searching" || status === "locating") && (
        <p className="loading-msg">
          <Loader2 size={14} className="spin" />
          {status === "locating" ? "Getting your location…" : `Searching for ${NEARBY_CATEGORY_META[activeCategory].label.toLowerCase()}…`}
        </p>
      )}

      {status === "error" && (
        <p className="error-msg">
          <AlertCircle size={14} /> {errorMessage}
        </p>
      )}

      {status === "done" && places.length === 0 && <p className="empty-note">No nearby places found.</p>}

      {status === "done" && places.length > 0 && (
        <>
          <div className="nearby-panel__map">
            <MapView
              origin={geo.coords}
              originIsGps
              heading={geo.heading}
              nearbyPlaces={places}
              selectedPlaceId={selectedId}
              onSelectPlace={(place) => setSelectedId(place.id)}
              onRequestMyLocation={geo.requestLocation}
              heightClassName="nearby-panel__map-fill"
            />
          </div>
          <div className="nearby-panel__list">
            {places.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                selected={place.id === selectedId}
                onSelect={() => setSelectedId(place.id === selectedId ? null : place.id)}
                onNavigateHere={() => onNavigateHere?.(place)}
              />
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
