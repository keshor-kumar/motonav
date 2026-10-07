import { useEffect, useRef } from "react";
import maplibregl, { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMapTilerStyleUrl, hasMapTilerKey } from "@/config/env";
import { toLngLat, boundsFromGeometry, boundsFromPoints } from "@/services/mapService";
import { MOTO_TOPDOWN_SVG, FLAG_SVG } from "@/utils/mapGlyphs";
import { NEARBY_CATEGORY_META } from "@/components/nearby/categoryMeta";
import type { Coordinates, NearbyPlace, RiderPresence } from "@/types";

// ============================================================
// The single MapLibre map for the whole app (MapTiler dark style). It is
// created once and never rebuilt; everything else is driven by props.
//
// The camera only moves when asked: fitBounds for a fresh route / nearby
// results, easeTo for recenter / focus / navigation-follow. GPS updates
// move markers only, so manual panning is never fought.
// ============================================================

const DEFAULT_CENTER: Coordinates = { lat: 20.5937, lng: 78.9629 };
const DEFAULT_ZOOM = 4.5;
const ROUTE_SOURCE_ID = "motonav-route";
const ROUTE_LAYER_ID = "motonav-route-line";
const ROUTE_CASING_ID = "motonav-route-casing";

/** Minimal data MapView needs to draw one co-rider (distance/presence derived by the caller). */
export interface CoRiderMarker {
  id: string;
  name: string;
  coords: Coordinates;
  heading: number | null;
  distanceLabel: string | null;
  presence: RiderPresence;
}

export interface MapPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Ask the camera to move to a point; bump `token` to trigger again. */
export interface FocusTarget {
  coords: Coordinates;
  token: number;
  zoom?: number;
}

const DEFAULT_PADDING: MapPadding = { top: 80, right: 40, bottom: 80, left: 40 };

type MarkerKind = "moto" | "start" | "destination" | "place" | "corider";

function buildMarkerEl(kind: MarkerKind): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `map-marker map-marker--${kind}`;
  switch (kind) {
    case "moto":
      // The rotating child is separate so heading updates never touch the element MapLibre positions.
      el.innerHTML = `<span class="map-marker__halo"></span><div class="map-marker__rotor">${MOTO_TOPDOWN_SVG}</div>`;
      break;
    case "corider":
      el.innerHTML = `<div class="map-marker__rotor map-marker__rotor--co">${MOTO_TOPDOWN_SVG}</div><span class="map-marker__label"></span>`;
      break;
    case "start":
      el.innerHTML = `<span class="map-marker__dot"></span>`;
      break;
    case "destination":
      el.innerHTML = `<span class="map-marker__flag">${FLAG_SVG}</span>`;
      break;
    default:
      el.innerHTML = `<span class="map-marker__pin"></span>`;
  }
  return el;
}

/** Rotate a rider marker to its real heading, relative to the map's current bearing. */
function setRotor(marker: Marker, heading: number | null | undefined, bearing: number): void {
  const rotor = marker.getElement().querySelector<HTMLElement>(".map-marker__rotor");
  if (rotor && typeof heading === "number") rotor.style.transform = `rotate(${heading - bearing}deg)`;
}

interface MapViewProps {
  origin?: Coordinates | null;
  /** True when `origin` is a real GPS fix — drawn as the motorcycle "you" marker. */
  originIsGps?: boolean;
  destination?: Coordinates | null;
  /** Live GPS position (navigation) — always the motorcycle marker. */
  liveCoords?: Coordinates | null;
  heading?: number | null;
  routeGeometry?: [number, number][];
  /** Frame the route when it changes. Turn off while navigating. */
  fitRoute?: boolean;
  nearbyPlaces?: NearbyPlace[];
  selectedPlaceId?: string | null;
  onSelectPlace?: (place: NearbyPlace) => void;
  coRiders?: CoRiderMarker[];
  selectedCoRiderId?: string | null;
  onSelectCoRider?: (id: string) => void;
  focusTarget?: FocusTarget | null;
  recenterToken?: number;
  /** Navigation camera: tilted, and (with `follow`) rotating with the rider's heading. */
  navigationMode?: boolean;
  follow?: boolean;
  onUserPan?: () => void;
  /** Screen area covered by sheets/panels, so framing happens in the visible part of the map. */
  padding?: MapPadding;
  cooperativeGestures?: boolean;
  heightClassName?: string;
}

export default function MapView({
  origin,
  originIsGps = false,
  destination,
  liveCoords,
  heading,
  routeGeometry = [],
  fitRoute = true,
  nearbyPlaces = [],
  selectedPlaceId,
  onSelectPlace,
  coRiders = [],
  selectedCoRiderId,
  onSelectCoRider,
  focusTarget,
  recenterToken = 0,
  navigationMode = false,
  follow = false,
  onUserPan,
  padding,
  cooperativeGestures = false,
  heightClassName = "",
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const loadedRef = useRef(false);
  const youMarkerRef = useRef<Marker | null>(null);
  const destMarkerRef = useRef<Marker | null>(null);
  const placeMarkersRef = useRef<Map<string, Marker>>(new Map());
  const coMarkersRef = useRef<Map<string, Marker>>(new Map());
  const headingsRef = useRef<Map<string, number | null>>(new Map());

  // Latest props for event handlers registered once.
  const paddingRef = useRef<MapPadding>(padding ?? DEFAULT_PADDING);
  paddingRef.current = padding ?? DEFAULT_PADDING;
  const onUserPanRef = useRef(onUserPan);
  onUserPanRef.current = onUserPan;
  const onSelectPlaceRef = useRef(onSelectPlace);
  onSelectPlaceRef.current = onSelectPlace;
  const onSelectCoRiderRef = useRef(onSelectCoRider);
  onSelectCoRiderRef.current = onSelectCoRider;

  function refreshHeadings() {
    const map = mapRef.current;
    if (!map) return;
    const bearing = map.getBearing();
    if (youMarkerRef.current) setRotor(youMarkerRef.current, headingsRef.current.get("me"), bearing);
    for (const [id, marker] of coMarkersRef.current) setRotor(marker, headingsRef.current.get(id), bearing);
  }

  // ---- init the map once ----
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const start = origin ?? destination ?? DEFAULT_CENTER;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: hasMapTilerKey ? getMapTilerStyleUrl() : "https://demotiles.maplibre.org/style.json",
      center: toLngLat(start),
      zoom: origin || destination ? 12 : DEFAULT_ZOOM,
      cooperativeGestures,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      loadedRef.current = true;
      map.addSource(ROUTE_SOURCE_ID, {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
      });
      map.addLayer({
        id: ROUTE_CASING_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#e10600", "line-width": 11, "line-opacity": 0.22, "line-blur": 3 },
      });
      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#ff2a1f", "line-width": 5, "line-opacity": 0.95 },
      });
    });
    map.on("dragstart", () => onUserPanRef.current?.());
    map.on("rotate", refreshHeadings);

    mapRef.current = map;

    // The container can be resized (orientation, sheet layout) without a remount.
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

  // ---- "you": motorcycle when it's a real GPS fix, plain start dot otherwise ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const point = liveCoords ?? origin;
    if (!point) {
      youMarkerRef.current?.remove();
      youMarkerRef.current = null;
      return;
    }
    const isMoto = Boolean(liveCoords) || originIsGps;
    const kind: MarkerKind = isMoto ? "moto" : "start";
    let marker = youMarkerRef.current;
    if (marker && marker.getElement().classList.contains(`map-marker--${kind}`)) {
      marker.setLngLat(toLngLat(point));
    } else {
      marker?.remove();
      marker = new maplibregl.Marker({ element: buildMarkerEl(kind) }).setLngLat(toLngLat(point)).addTo(map);
      youMarkerRef.current = marker;
    }
    marker.getElement().classList.toggle("is-live", Boolean(liveCoords));
    if (isMoto) {
      headingsRef.current.set("me", heading ?? null);
      refreshHeadings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, liveCoords, originIsGps, heading]);

  // ---- destination ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!destination) {
      destMarkerRef.current?.remove();
      destMarkerRef.current = null;
      return;
    }
    if (!destMarkerRef.current) {
      destMarkerRef.current = new maplibregl.Marker({ element: buildMarkerEl("destination"), anchor: "bottom" })
        .setLngLat(toLngLat(destination))
        .addTo(map);
    } else {
      destMarkerRef.current.setLngLat(toLngLat(destination));
    }
  }, [destination]);

  // ---- route line (+ frame it when a new route arrives) ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const source = map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!source) return;
      source.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: routeGeometry.map(([lat, lng]) => [lng, lat]) },
      });
      const bounds = boundsFromGeometry(routeGeometry);
      if (bounds && fitRoute) map.fitBounds(bounds, { padding: paddingRef.current, maxZoom: 16, duration: 600 });
    };
    if (loadedRef.current) apply();
    else map.once("load", apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeGeometry]);

  // ---- nearby places: markers (add / remove / restyle) ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const ids = new Set(nearbyPlaces.map((p) => p.id));
    for (const [id, marker] of placeMarkersRef.current) {
      if (!ids.has(id)) {
        marker.remove();
        placeMarkersRef.current.delete(id);
      }
    }
    for (const place of nearbyPlaces) {
      let marker = placeMarkersRef.current.get(place.id);
      if (!marker) {
        const el = buildMarkerEl("place");
        el.style.setProperty("--pin", NEARBY_CATEGORY_META[place.category].color);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelectPlaceRef.current?.(place);
        });
        marker = new maplibregl.Marker({ element: el }).setLngLat(toLngLat(place.coords)).addTo(map);
        placeMarkersRef.current.set(place.id, marker);
      }
      marker.getElement().classList.toggle("map-marker--selected", place.id === selectedPlaceId);
    }
  }, [nearbyPlaces, selectedPlaceId]);

  // ---- nearby places: frame the results once per new result set ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || nearbyPlaces.length === 0) return;
    const bounds = boundsFromPoints(nearbyPlaces.map((p) => p.coords));
    if (bounds) map.fitBounds(bounds, { padding: paddingRef.current, maxZoom: 15, duration: 600 });
  }, [nearbyPlaces]);

  // ---- co-riders (real group-ride positions) ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const ids = new Set(coRiders.map((r) => r.id));
    for (const [id, marker] of coMarkersRef.current) {
      if (!ids.has(id)) {
        marker.remove();
        coMarkersRef.current.delete(id);
        headingsRef.current.delete(id);
      }
    }
    for (const rider of coRiders) {
      let marker = coMarkersRef.current.get(rider.id);
      if (!marker) {
        const el = buildMarkerEl("corider");
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelectCoRiderRef.current?.(rider.id);
        });
        marker = new maplibregl.Marker({ element: el }).setLngLat(toLngLat(rider.coords)).addTo(map);
        coMarkersRef.current.set(rider.id, marker);
      } else {
        marker.setLngLat(toLngLat(rider.coords));
      }
      const el = marker.getElement();
      el.classList.toggle("map-marker--offline", rider.presence === "offline");
      el.classList.toggle("is-live", rider.presence === "riding");
      el.classList.toggle("map-marker--selected", rider.id === selectedCoRiderId);
      const label = el.querySelector<HTMLElement>(".map-marker__label");
      if (label) label.textContent = rider.distanceLabel ? `${rider.name} · ${rider.distanceLabel}` : rider.name;
      headingsRef.current.set(rider.id, rider.heading);
    }
    refreshHeadings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coRiders, selectedCoRiderId]);

  // ---- explicit camera requests ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusTarget) return;
    map.easeTo({
      center: toLngLat(focusTarget.coords),
      zoom: Math.max(map.getZoom(), focusTarget.zoom ?? 15),
      padding: paddingRef.current,
      duration: 600,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTarget?.token]);

  useEffect(() => {
    const map = mapRef.current;
    const target = liveCoords ?? origin;
    if (!map || !target || recenterToken === 0) return;
    map.easeTo({ center: toLngLat(target), zoom: Math.max(map.getZoom(), 15), padding: paddingRef.current, duration: 500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterToken]);

  // ---- navigation camera ----
  const wasNavigatingRef = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (navigationMode) {
      map.easeTo({ pitch: 50, duration: 700 });
    } else if (wasNavigatingRef.current) {
      map.easeTo({ pitch: 0, bearing: 0, duration: 700 });
    }
    wasNavigatingRef.current = navigationMode;
  }, [navigationMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !navigationMode || !follow || !liveCoords) return;
    map.easeTo({
      center: toLngLat(liveCoords),
      bearing: typeof heading === "number" ? heading : map.getBearing(),
      zoom: Math.max(map.getZoom(), 16),
      padding: paddingRef.current,
      duration: 900,
      essential: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveCoords, heading, follow, navigationMode]);

  return (
    <div className={`map-view ${heightClassName}`}>
      <div ref={containerRef} className="map-view__container" />
      {!hasMapTilerKey && (
        <div className="map-view__key-warning">MapTiler API key missing — showing a fallback style. Set VITE_MAPTILER_API_KEY.</div>
      )}
    </div>
  );
}
