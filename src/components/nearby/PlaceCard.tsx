import { Navigation2 } from "lucide-react";
import type { NearbyPlace } from "@/types";
import { NEARBY_CATEGORY_META } from "@/components/nearby/categoryMeta";
import { formatDistanceMeters } from "@/utils/format";

interface PlaceCardProps {
  place: NearbyPlace;
  selected: boolean;
  onSelect: () => void;
  onNavigateHere: () => void;
}

/** A real Geoapify result: name, address, and straight-line distance from the rider's GPS. */
export default function PlaceCard({ place, selected, onSelect, onNavigateHere }: PlaceCardProps) {
  const meta = NEARBY_CATEGORY_META[place.category];
  const Icon = meta.icon;
  return (
    <div className={`poi-card ${selected ? "poi-card--selected" : ""}`}>
      <button type="button" className="poi-card__row" onClick={onSelect} aria-pressed={selected}>
        <span className="poi-card__icon" style={{ color: meta.color }}>
          <Icon size={18} strokeWidth={2} />
        </span>
        <span className="poi-card__body">
          <span className="poi-card__name">{place.name}</span>
          <span className="poi-card__address">{place.address}</span>
        </span>
        <span className="poi-card__dist">{formatDistanceMeters(place.distanceMeters)}</span>
      </button>
      {selected && (
        <div className="poi-card__actions">
          <button type="button" className="btn btn--primary btn--md btn--full" onClick={onNavigateHere}>
            <Navigation2 size={16} /> Navigate here
          </button>
        </div>
      )}
    </div>
  );
}
