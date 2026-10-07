import { Loader2, AlertCircle, Undo2 } from "lucide-react";
import LocationPermissionButton from "@/components/navigation/LocationPermissionButton";
import LocationSearchField from "@/components/navigation/LocationSearchField";
import RouteSummaryCard from "@/components/navigation/RouteSummaryCard";
import type { useRoutePlanner } from "@/hooks/useRoutePlanner";

type Planner = ReturnType<typeof useRoutePlanner>;

export default function RoutePanel({ planner }: { planner: Planner }) {
  const { nav, geo, original, isDiverted } = planner;

  return (
    <div className="panel-stack">
      <LocationPermissionButton status={geo.status} onRequest={geo.requestLocation} />

      <LocationSearchField
        key={`origin-${nav.origin?.source === "gps" ? "gps" : nav.origin?.label ?? ""}`}
        label="Starting location"
        placeholder="Or search a starting point"
        initialValue={nav.origin && nav.origin.source !== "gps" ? nav.origin.label : ""}
        onSelect={nav.setOriginFromSearchResult}
      />
      <LocationSearchField
        key={`dest-${nav.destination?.label ?? ""}`}
        label="Destination"
        placeholder="Search destination (e.g. Ooty, Chennai Airport)"
        initialValue={nav.destination?.label ?? ""}
        onSelect={planner.selectDestination}
      />

      {isDiverted && original && (
        <button type="button" className="btn btn--ghost btn--md" onClick={planner.returnToOriginal}>
          <Undo2 size={15} /> Back to {original.label}
        </button>
      )}

      {(nav.status === "routing" || nav.status === "geocoding-origin" || nav.status === "geocoding-destination") && (
        <p className="loading-msg">
          <Loader2 size={14} className="spin" /> Calculating route…
        </p>
      )}
      {nav.status === "error" && (
        <p className="error-msg">
          <AlertCircle size={14} /> {nav.errorMessage}
        </p>
      )}

      {planner.routeReady && nav.route && nav.origin && nav.destination && (
        <RouteSummaryCard origin={nav.origin} destination={nav.destination} route={nav.route} onStartNavigation={planner.startNavigation} />
      )}
    </div>
  );
}
