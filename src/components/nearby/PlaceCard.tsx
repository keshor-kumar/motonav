import { MapPin, Navigation2 } from "lucide-react";
import type { NearbyPlace } from "@/types";
import { NEARBY_CATEGORY_META } from "@/components/nearby/categoryMeta";
import { formatDistanceMeters } from "@/utils/format";

interface PlaceCardProps {
  place: NearbyPlace;
  selected: boolean;
  onSelect: () => void;
  onNavigateHere: () => void;
}

/** A real Geoapify Places result — name, category, address, and real distance from the rider's GPS position. */
export default function PlaceCard({ place, selected, onSelect, onNavigateHere }: PlaceCardProps) {
  const meta = NEARBY_CATEGORY_META[place.category];

  return (
    <div className={`place-card ${selected ? "place-card--selected" : ""}`}>
      <button type="button" className="place-card__row place-card__row--button" onClick={onSelect}>
        <div className="place-card__icon" aria-hidden="true">
          <span className="place-card__emoji">{meta.emoji}</span>
        </div>
        <div className="place-card__body">
          <div className="place-card__top">
            <span className="place-card__name">{place.name}</span>
          </div>
          <span className="place-card__address">
            <MapPin size={11} /> {place.address}
          </span>
          <div className="place-card__meta">
            <span>{formatDistanceMeters(place.distanceMeters)} away</span>
          </div>
        </div>
      </button>

      {selected && (
        <div className="place-card__details">
          <button type="button" className="btn btn--primary btn--md place-card__navigate" onClick={onNavigateHere}>
            <Navigation2 size={15} /> Navigate here
          </button>
        </div>
      )}
    </div>
  );
}
