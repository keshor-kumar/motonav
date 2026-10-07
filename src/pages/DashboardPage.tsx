import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, Flag, X } from "lucide-react";
import MapView, { type CoRiderMarker, type FocusTarget, type MapPadding } from "@/components/map/MapView";
import WindIndicator from "@/components/map/WindIndicator";
import AppTopBar from "@/components/app/AppTopBar";
import AppDock, { type DashTab } from "@/components/app/AppDock";
import AppSheet from "@/components/app/AppSheet";
import PeekBar from "@/components/app/PeekBar";
import MapRail, { type ConditionId } from "@/components/app/MapRail";
import ConditionPanel from "@/components/app/ConditionPanel";
import RoutePanel from "@/components/app/RoutePanel";
import CrewPanel from "@/components/app/CrewPanel";
import NearbySheet from "@/components/app/NearbySheet";
import MorePanel from "@/components/app/MorePanel";
import RiderDetailSheet from "@/components/app/RiderDetailSheet";
import NavigationHeader from "@/components/navigation/guidance/NavigationHeader";
import NavigationBottomSheet from "@/components/navigation/guidance/NavigationBottomSheet";
import WarmupScreen from "@/components/warmup/WarmupScreen";
import { NEARBY_CATEGORY_ORDER } from "@/components/nearby/categoryMeta";
import { useGroupRide } from "@/context/GroupRideContext";
import { useRoutePlanner } from "@/hooks/useRoutePlanner";
import { useNearbyPlaces } from "@/hooks/useNearbyPlaces";
import { useGuidance } from "@/hooks/useGuidance";
import { useSeparationAlerts } from "@/hooks/useSeparationAlerts";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { usePersistentState } from "@/hooks/usePersistentState";
import { haversineMeters } from "@/utils/geo";
import { derivePresence } from "@/utils/presence";
import { formatDistanceMeters } from "@/utils/format";
import type { Coordinates, GroupMember, NavLocation, NearbyPlace, PlaceCategory } from "@/types";

// Stable empties so MapView's effects don't re-run on every render.
const EMPTY_GEOMETRY: [number, number][] = [];
const EMPTY_PLACES: NearbyPlace[] = [];
const EMPTY_MEMBERS: GroupMember[] = [];

const TABS: DashTab[] = ["route", "crew", "nearby", "more"];

export default function DashboardPage() {
  const groupRide = useGroupRide();
  const [params] = useSearchParams();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [tab, setTab] = useState<DashTab>("route");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingDestination, setPendingDestination] = useState<NavLocation | null>(null);
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  const [condition, setCondition] = useState<ConditionId | null>(null);
  const [showWarmup, setShowWarmup] = useState(false);
  const [separationMeters, setSeparationMeters] = usePersistentState<number>("motonav.separationMeters", 2000);

  const clearPending = useCallback(() => setPendingDestination(null), []);
  const planner = useRoutePlanner({ pendingDestination, onPendingDestinationHandled: clearPending });
  const nearby = useNearbyPlaces();
  const { nav, geo } = planner;

  const inRealRide = Boolean(groupRide.session && groupRide.ride);

  // ---- real group ride: shared destination + starting from my own GPS ----
  const seededRideId = useRef<string | null>(null);
  useEffect(() => {
    const ride = groupRide.ride;
    if (ride && seededRideId.current !== ride.id) {
      seededRideId.current = ride.id;
      setPendingDestination({
        label: ride.destination,
        coords: { lat: ride.destinationLatitude, lng: ride.destinationLongitude },
        source: "search",
      });
    }
  }, [groupRide.ride]);

  useEffect(() => {
    if (inRealRide && groupRide.myCoords && !nav.origin && !planner.isNavigating) {
      nav.setOrigin({ label: "Current location", coords: groupRide.myCoords, source: "gps" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRealRide, groupRide.myCoords, nav.origin, planner.isNavigating]);

  // ---- deep links: /dashboard?tab=nearby&cat=hospital ----
  useEffect(() => {
    const t = params.get("tab") as DashTab | null;
    const cat = params.get("cat");
    if (t && TABS.includes(t)) {
      setTab(t);
      setSheetOpen(true);
    }
    if (cat && (NEARBY_CATEGORY_ORDER as string[]).includes(cat)) {
      setTab("nearby");
      setSheetOpen(true);
      nearby.selectCategory(cat as PlaceCategory);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // ---- co-riders (real, from the group-ride socket) ----
  const myId = groupRide.session?.riderId;
  const others = useMemo(() => groupRide.members.filter((m) => m.riderId !== myId), [groupRide.members, myId]);
  const othersRef = useRef(others);
  othersRef.current = others;

  const coRiders = useMemo<CoRiderMarker[]>(
    () =>
      others
        .filter((m) => m.latitude !== null && m.longitude !== null)
        .map((m) => {
          const coords = { lat: m.latitude as number, lng: m.longitude as number };
          return {
            id: m.riderId,
            name: m.name,
            coords,
            heading: m.heading,
            distanceLabel: groupRide.myCoords ? formatDistanceMeters(haversineMeters(groupRide.myCoords, coords)) : null,
            presence: derivePresence(m),
          };
        }),
    [others, groupRide.myCoords]
  );

  const handleSelectRider = useCallback((id: string) => {
    setSelectedRiderId(id);
    const m = othersRef.current.find((r) => r.riderId === id);
    if (m && m.latitude !== null && m.longitude !== null) {
      setFocusTarget({ coords: { lat: m.latitude, lng: m.longitude }, token: Date.now() });
    }
  }, []);

  const selectedMember = others.find((m) => m.riderId === selectedRiderId) ?? null;
  const selectedDistance =
    selectedMember && groupRide.myCoords && selectedMember.latitude !== null && selectedMember.longitude !== null
      ? formatDistanceMeters(haversineMeters(groupRide.myCoords, { lat: selectedMember.latitude, lng: selectedMember.longitude }))
      : null;

  // ---- one way to start a route to anywhere: nearby place, co-rider, … ----
  const navigateTo = useCallback((label: string, coords: Coordinates) => {
    setPendingDestination({ label, coords, source: "search" });
    setSelectedRiderId(null);
    setTab("route");
    setSheetOpen(true);
  }, []);

  const handleSelectPlace = useCallback(
    (place: NearbyPlace) => {
      nearby.setSelectedId(place.id);
      setTab("nearby");
      setSheetOpen(true);
      setFocusTarget({ coords: place.coords, token: Date.now() });
    },
    [nearby.setSelectedId]
  );

  const openTab = useCallback(
    (next: DashTab) => {
      if (!isDesktop && next === tab && sheetOpen) {
        setSheetOpen(false);
        return;
      }
      setTab(next);
      setSheetOpen(true);
    },
    [tab, sheetOpen, isDesktop]
  );

  // ---- guidance + alerts ----
  const guidance = useGuidance(planner.isNavigating ? nav.route : null, geo.coords, geo.speed);
  const { alert: separationAlert, dismiss: dismissSeparation } = useSeparationAlerts(
    inRealRide ? others : EMPTY_MEMBERS,
    groupRide.myCoords,
    separationMeters
  );

  const activeAlerts = useMemo(() => {
    const list: string[] = [];
    if (groupRide.rideEndedNotice) list.push("This ride has ended.");
    if (separationAlert) list.push(`${separationAlert.name} is ${formatDistanceMeters(separationAlert.distanceMeters)} away from you.`);
    if (groupRide.error) list.push(groupRide.error);
    return list;
  }, [groupRide.rideEndedNotice, groupRide.error, separationAlert]);

  const padding = useMemo<MapPadding>(() => {
    if (planner.isNavigating) return isDesktop ? { top: 170, right: 70, bottom: 220, left: 70 } : { top: 190, right: 20, bottom: 290, left: 20 };
    return isDesktop ? { top: 100, right: 90, bottom: 60, left: 480 } : { top: 110, right: 20, bottom: sheetOpen ? 330 : 210, left: 20 };
  }, [planner.isNavigating, isDesktop, sheetOpen]);

  const windCoords = geo.coords ?? nav.origin?.coords ?? groupRide.myCoords ?? null;

  return (
    <div className={`app-shell ${planner.isNavigating ? "app-shell--nav" : ""} ${sheetOpen && !planner.isNavigating ? "app-shell--sheet-open" : ""}`}>
      <MapView
        origin={nav.origin?.coords}
        originIsGps={nav.origin?.source === "gps"}
        destination={nav.destination?.coords}
        liveCoords={planner.isNavigating ? geo.coords : null}
        heading={geo.heading}
        routeGeometry={nav.route?.geometry ?? EMPTY_GEOMETRY}
        fitRoute={!planner.isNavigating}
        nearbyPlaces={tab === "nearby" ? nearby.places : EMPTY_PLACES}
        selectedPlaceId={nearby.selectedId}
        onSelectPlace={handleSelectPlace}
        coRiders={coRiders}
        selectedCoRiderId={selectedRiderId}
        onSelectCoRider={handleSelectRider}
        focusTarget={focusTarget}
        recenterToken={planner.recenterToken}
        navigationMode={planner.isNavigating}
        follow={planner.following}
        onUserPan={() => planner.setFollowing(false)}
        padding={padding}
        heightClassName="app-shell__map"
      />

      {!planner.isNavigating && <WindIndicator coords={windCoords} heading={geo.heading} />}

      {planner.isNavigating ? (
        <NavigationHeader guidance={guidance} destinationLabel={nav.destination?.label ?? "your destination"} />
      ) : (
        <AppTopBar
          rideName={inRealRide ? groupRide.ride!.rideName : null}
          rideCode={inRealRide ? groupRide.ride!.rideCode : null}
          connection={inRealRide ? { isConnected: groupRide.isConnected, onRetry: groupRide.retryConnection } : null}
          onOpenCrew={() => openTab("crew")}
          onOpenMore={() => openTab("more")}
        />
      )}

      <div className="app-toasts" aria-live="polite">
        {groupRide.rideEndedNotice && (
          <div className="toast">
            <Flag size={16} /> <span>This ride has ended.</span>
            <button type="button" onClick={groupRide.acknowledgeRideEnded} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        )}
        {separationAlert && (
          <div className="toast toast--warn">
            <AlertTriangle size={16} />
            <span>
              {separationAlert.name} is {formatDistanceMeters(separationAlert.distanceMeters)} away from you.
            </span>
            <button type="button" onClick={dismissSeparation} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        )}
        {groupRide.error && (
          <div className="toast toast--warn">
            <AlertTriangle size={16} /> <span>{groupRide.error}</span>
            <button type="button" onClick={groupRide.clearError} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      <MapRail
        onLocate={planner.isNavigating ? planner.recenter : geo.requestLocation}
        locating={geo.status === "requesting"}
        onSelectCondition={setCondition}
        alertCount={activeAlerts.length}
        compact={planner.isNavigating}
      />

      {planner.isNavigating ? (
        <NavigationBottomSheet
          guidance={guidance}
          following={planner.following}
          onRecenter={planner.recenter}
          onEnd={planner.endNavigation}
          onRecalculate={planner.recalculateFromHere}
        />
      ) : (
        <>
          <AppSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            peek={
              <PeekBar
                planner={planner}
                onOpen={() => {
                  setTab("route");
                  setSheetOpen(true);
                }}
              />
            }
          >
            {tab === "route" && <RoutePanel planner={planner} />}
            {tab === "crew" && <CrewPanel selectedRiderId={selectedRiderId} onSelectRider={handleSelectRider} />}
            {tab === "nearby" && (
              <NearbySheet
                nearby={nearby}
                onSelectPlace={handleSelectPlace}
                onNavigateHere={(place) => navigateTo(place.name, place.coords)}
              />
            )}
            {tab === "more" && <MorePanel onOpenWarmup={() => setShowWarmup(true)} separationMeters={separationMeters} onSeparationChange={setSeparationMeters} />}
          </AppSheet>
          <AppDock active={tab} sheetOpen={sheetOpen} crewCount={inRealRide ? groupRide.members.length : 0} onSelect={openTab} />
        </>
      )}

      {selectedMember && !planner.isNavigating && (
        <RiderDetailSheet
          member={selectedMember}
          presence={derivePresence(selectedMember)}
          distanceLabel={selectedDistance}
          onClose={() => setSelectedRiderId(null)}
          onNavigate={() => {
            if (selectedMember.latitude !== null && selectedMember.longitude !== null) {
              navigateTo(selectedMember.name, { lat: selectedMember.latitude, lng: selectedMember.longitude });
            }
          }}
        />
      )}

      {condition && (
        <ConditionPanel id={condition} coords={windCoords} route={nav.route} alerts={activeAlerts} onClose={() => setCondition(null)} />
      )}
      {showWarmup && <WarmupScreen onClose={() => setShowWarmup(false)} />}
    </div>
  );
}
