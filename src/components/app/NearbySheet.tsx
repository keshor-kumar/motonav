import { Loader2, AlertCircle } from "lucide-react";
import LocationPermissionButton from "@/components/navigation/LocationPermissionButton";
import PlaceCard from "@/components/nearby/PlaceCard";
import { NEARBY_CATEGORY_META, NEARBY_CATEGORY_ORDER } from "@/components/nearby/categoryMeta";
import type { useNearbyPlaces } from "@/hooks/useNearbyPlaces";
import type { NearbyPlace } from "@/types";

type NearbyApi = ReturnType<typeof useNearbyPlaces>;

interface NearbySheetProps {
  nearby: NearbyApi;
  onSelectPlace: (place: NearbyPlace) => void;
  onNavigateHere: (place: NearbyPlace) => void;
}

/** Category icons + real Geoapify results. Markers appear on the main map, not in a second map here. */
export default function NearbySheet({ nearby, onSelectPlace, onNavigateHere }: NearbySheetProps) {
  const { geo, activeCategory, places, selectedId, status, errorMessage, selectCategory, setSelectedId } = nearby;

  return (
    <div className="panel-stack">
      {!geo.coords && <LocationPermissionButton status={geo.status} onRequest={geo.requestLocation} />}

      <div className="poi-cats" role="tablist" aria-label="Nearby category">
        {NEARBY_CATEGORY_ORDER.map((cat) => {
          const { label, icon: Icon } = NEARBY_CATEGORY_META[cat];
          const active = activeCategory === cat;
          return (
            <button key={cat} type="button" role="tab" aria-selected={active} className={`poi-cat ${active ? "poi-cat--active" : ""}`} onClick={() => selectCategory(cat)}>
              <Icon size={20} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {activeCategory && (status === "locating" || status === "searching") && (
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
        <div className="poi-list">
          {places.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              selected={place.id === selectedId}
              onSelect={() => (place.id === selectedId ? setSelectedId(null) : onSelectPlace(place))}
              onNavigateHere={() => onNavigateHere(place)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
