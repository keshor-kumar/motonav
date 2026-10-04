import { useEffect, useRef } from "react";
import maplibregl, { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMapTilerStyleUrl, hasMapTilerKey } from "@/config/env";
import { toLngLat, boundsFromGeometry, boundsFromPoints } from "@/services/mapService";
import type { Coordinates, NearbyPlace, RiderPresence } from "@/types";

/** Minimal, pre-computed data MapView needs to draw one co-rider — distance
 *  label and presence are derived by the caller (see utils/presence.ts and
 *  utils/format.ts) so this component stays free of that logic. */
export interface CoRiderMarker {
  id: string;
  name: string;
  coords: Coordinates;
  heading: number | null;
  distanceLabel: string | null;
  presence: RiderPresence;
}

// ============================================================
// Real interactive map — MapLibre GL JS + MapTiler tiles/style.
// No fake map image anywhere. `cooperativeGestures` is the key
// setting here: without it, a one-finger touch-drag (mobile) or a
// bare mouse-wheel (desktop) over the map hijacks the gesture for
// map pan/zoom instead of letting the page scroll underneath it —
// that was the root cause of the "dashboard won't scroll" bug.
// With it on, the page scrolls normally and the map only pans/zooms
// on a deliberate two-finger touch (or Ctrl/Cmd+scroll on desktop),
// with a small on-map hint shown the first time someone tries the
// single-finger gesture.
//
// The map never auto-recenters on its own — GPS updates only move
// the marker (setLngLat), never the camera. Only an explicit
// recenterToken bump (the "My Location" / Recenter button) or a
// fresh route/nearby-places result (fitBounds, a one-time framing)
// ever moves the camera, so manual panning is never fought.
// ============================================================

const DEFAULT_CENTER: Coordinates = { lat: 20.5937, lng: 78.9629 }; // India, roughly — only used before any point is known
const DEFAULT_ZOOM = 4.5;
const ROUTE_SOURCE_ID = "motonav-route";
const ROUTE_LAYER_ID = "motonav-route-line";

type MarkerKind = "moto" | "start" | "destination" | "place" | "corider";

function buildMarkerEl(kind: MarkerKind, selected = false): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `map-marker map-marker--${kind}${selected ? " map-marker--selected" : ""}`;
  if (kind === "moto") {
    // The rotating wrapper is a separate inner element so heading updates
    // (frequent, during navigation) never touch the outer element MapLibre
    // itself manages, and never require rebuilding the marker.
    el.innerHTML = `<span class="map-marker__moto-pulse"></span><div class="map-marker__moto-rotate"><span class="map-marker__moto-icon">🏍️</span></div>`;
  } else if (kind === "corider") {
    // A co-rider's own motorcycle marker — same mechanics as "moto" but
    // visually distinct (color + label) from the current rider's own marker.
    el.innerHTML =
      `<div class="map-marker__corider-rotate"><span class="map-marker__corider-icon">🏍️</span></div>` +
      `<span class="map-marker__corider-label"></span>`;
  } else if (kind === "start") {
    el.innerHTML = `<span class="map-marker__dot"><span class="map-marker__pulse"></span></span>`;
  } else if (kind === "destination") {
    el.innerHTML = `<span class="map-marker__flag">🏁</span>`;
  } else {
    el.innerHTML = `<span class="map-marker__pin"></span>`;
  }
  return el;
}

/** Rotates a "moto"/"corider" marker's inner element to face `heading` degrees (0 = north). No-op otherwise. */
function applyMarkerHeading(marker: Marker, heading: number | null | undefined): void {
  const rotor = marker.getElement().querySelector<HTMLElement>(".map-marker__moto-rotate, .map-marker__corider-rotate");
  if (rotor && typeof heading === "number") {
    rotor.style.transform = `rotate(${heading}deg)`;
  }
}

interface MapViewProps {
  origin?: Coordinates | null;
  /** True when `origin` is the rider's real current GPS fix — renders as the
   *  motorcycle "you" marker instead of a plain start pin. */
  originIsGps?: boolean;
  destination?: Coordinates | null;
  /** Live GPS position during active navigation — always rendered as the motorcycle marker. */
  liveCoords?: Coordinates | null;
  /** Heading in degrees (0 = north) for whichever point is currently the motorcycle marker. */
  heading?: number | null;
  routeGeometry?: [number, number][];
  nearbyPlaces?: NearbyPlace[];
  selectedPlaceId?: string | null;
  onSelectPlace?: (place: NearbyPlace) => void;
  /** Real co-riders from an active group ride (never mock). Markers only — no fitBounds, so the
   *  camera never jumps around as people move; the rider pans/recenters manually. */
  coRiders?: CoRiderMarker[];
  /** Bump this number to pan back to `liveCoords ?? origin` (used by the My Location button). */
  recenterToken?: number;
  onRequestMyLocation?: () => void;
  heightClassName?: string;
}

export default function MapView({
  origin,
  originIsGps = false,
  destination,
  liveCoords,
  heading,
  routeGeometry = [],
  nearbyPlaces = [],
  selectedPlaceId,
  onSelectPlace,
  coRiders = [],
  recenterToken = 0,
  onRequestMyLocation,
  heightClassName = "",
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const loadedRef = useRef(false);
  const originMarkerRef = useRef<Marker | null>(null);
  const destMarkerRef = useRef<Marker | null>(null);
  const placeMarkersRef = useRef<Map<string, Marker>>(new Map());
  const coRiderMarkersRef = useRef<Map<string, Marker>>(new Map());

  // ---- init map once ----
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter = origin ?? destination ?? DEFAULT_CENTER;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: hasMapTilerKey ? getMapTilerStyleUrl() : "https://demotiles.maplibre.org/style.json",
      center: toLngLat(initialCenter),
      zoom: origin || destination ? 12 : DEFAULT_ZOOM,
      cooperativeGestures: true, // fixes page-scroll capture — see file header
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      loadedRef.current = true;
      map.addSource(ROUTE_SOURCE_ID, { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } } });
      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#ff6a33", "line-width": 5, "line-opacity": 0.9 },
      });
    });

    mapRef.current = map;

    // MapLibre doesn't detect its own container resizing on its own — and
    // this container can now go from `display:none` (0×0, e.g. while its
    // dashboard tab is hidden) back to visible without ever unmounting, so
    // without this the canvas can render blank or at a stale size. This
    // covers that transition plus any other resize (orientation change,
    // window resize) in one place.
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- origin / live "you" marker (motorcycle icon when it's a real GPS fix) ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const point = liveCoords ?? origin;
    if (!point) {
      originMarkerRef.current?.remove();
      originMarkerRef.current = null;
      return;
    }
    const isMoto = Boolean(liveCoords) || originIsGps;
    const desiredKind: MarkerKind = isMoto ? "moto" : "start";

    if (!originMarkerRef.current) {
      const el = buildMarkerEl(desiredKind);
      originMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat(toLngLat(point)).addTo(map);
    } else {
      const marker = originMarkerRef.current;
      const currentKind = marker.getElement().classList.contains("map-marker--moto") ? "moto" : "start";
      if (currentKind !== desiredKind) {
        // Kind changed (e.g. switched from a searched start to live GPS) — rebuild the element.
        marker.remove();
        const el = buildMarkerEl(desiredKind);
        originMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat(toLngLat(point)).addTo(map);
      } else {
        marker.setLngLat(toLngLat(point));
      }
    }
    if (isMoto) applyMarkerHeading(originMarkerRef.current, heading);
  }, [origin, liveCoords, originIsGps, heading]);

  // ---- destination marker ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!destination) {
      destMarkerRef.current?.remove();
      destMarkerRef.current = null;
      return;
    }
    if (!destMarkerRef.current) {
      destMarkerRef.current = new maplibregl.Marker({ element: buildMarkerEl("destination") }).setLngLat(toLngLat(destination)).addTo(map);
    } else {
      destMarkerRef.current.setLngLat(toLngLat(destination));
    }
  }, [destination]);

  // ---- route line + fit bounds (one-time framing when a new route arrives) ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const applyRoute = () => {
      const source = map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!source) return;
      const coords = routeGeometry.map(([lat, lng]) => [lng, lat]);
      source.setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } });
      const bounds = boundsFromGeometry(routeGeometry);
      if (bounds) map.fitBounds(bounds, { padding: 48, maxZoom: 16, duration: 500 });
    };
    if (loadedRef.current) applyRoute();
    else map.once("load", applyRoute);
  }, [routeGeometry]);

  // ---- nearby place markers ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(nearbyPlaces.map((p) => p.id));
    // remove stale markers
    for (const [id, marker] of placeMarkersRef.current) {
      if (!currentIds.has(id)) {
        marker.remove();
        placeMarkersRef.current.delete(id);
      }
    }
    // add/update markers
    for (const place of nearbyPlaces) {
      const selected = place.id === selectedPlaceId;
      const existing = placeMarkersRef.current.get(place.id);
      if (existing) {
        existing.getElement().className = `map-marker map-marker--place${selected ? " map-marker--selected" : ""}`;
        continue;
      }
      const el = buildMarkerEl("place", selected);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectPlace?.(place);
      });
      const marker = new maplibregl.Marker({ element: el }).setLngLat(toLngLat(place.coords)).addTo(map);
      placeMarkersRef.current.set(place.id, marker);
    }

    if (nearbyPlaces.length > 0) {
      const bounds = boundsFromPoints(nearbyPlaces.map((p) => p.coords));
      if (bounds) map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 500 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearbyPlaces, selectedPlaceId]);

  // ---- co-rider markers (real, from an active group ride) ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentIds = new Set(coRiders.map((r) => r.id));
    for (const [id, marker] of coRiderMarkersRef.current) {
      if (!currentIds.has(id)) {
        marker.remove();
        coRiderMarkersRef.current.delete(id);
      }
    }

    for (const rider of coRiders) {
      let marker = coRiderMarkersRef.current.get(rider.id);
      if (!marker) {
        marker = new maplibregl.Marker({ element: buildMarkerEl("corider") }).setLngLat(toLngLat(rider.coords)).addTo(map);
        coRiderMarkersRef.current.set(rider.id, marker);
      } else {
        marker.setLngLat(toLngLat(rider.coords));
      }
      const el = marker.getElement();
      el.classList.toggle("map-marker--offline", rider.presence === "offline");
      const label = el.querySelector<HTMLElement>(".map-marker__corider-label");
      if (label) label.textContent = rider.distanceLabel ? `${rider.name} · ${rider.distanceLabel}` : rider.name;
      applyMarkerHeading(marker, rider.heading);
    }
  }, [coRiders]);

  // ---- recenter on demand (My Location / Recenter button only) ----
  useEffect(() => {
    const map = mapRef.current;
    const target = liveCoords ?? origin;
    if (!map || !target || recenterToken === 0) return;
    map.easeTo({ center: toLngLat(target), zoom: Math.max(map.getZoom(), 15), duration: 400 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterToken]);

  return (
    <div className={`map-view ${heightClassName}`}>
      <div ref={containerRef} className="map-view__container" />
      {onRequestMyLocation && (
        <button className="map-view__mylocation" onClick={onRequestMyLocation} aria-label="Use my current location">
          📍 My Location
        </button>
      )}
      {!hasMapTilerKey && (
        <div className="map-view__key-warning">MapTiler API key missing — showing a fallback style. Set VITE_MAPTILER_API_KEY.</div>
      )}
    </div>
  );
}
