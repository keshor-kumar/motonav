import { useEffect, useRef, useState } from "react";
import { ChevronRight, Hash, AlertTriangle, X, Flag } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import BottomNav from "@/components/layout/BottomNav";
import RoutePlanner from "@/components/navigation/RoutePlanner";
import RidersPanel from "@/components/riders/RidersPanel";
import GroupRidersPanel from "@/components/ride/GroupRidersPanel";
import NearbyPanel from "@/components/nearby/NearbyPanel";
import VoicePanel from "@/components/voice/VoicePanel";
import MusicPlayerBar from "@/components/music/MusicPlayerBar";
import WarmupScreen from "@/components/warmup/WarmupScreen";
import ConnectionStatusBanner from "@/components/ride/ConnectionStatusBanner";
import Card from "@/components/common/Card";
import { mockRiders } from "@/data/riders";
import { mockRide } from "@/data/ride";
import { useRide } from "@/context/RideContext";
import { useGroupRide } from "@/context/GroupRideContext";
import { useSeparationAlerts } from "@/hooks/useSeparationAlerts";
import { derivePresence } from "@/utils/presence";
import { haversineMeters } from "@/utils/geo";
import { formatDistanceMeters } from "@/utils/format";
import type { CoRiderMarker } from "@/components/map/MapView";
import type { DashboardTab, GroupMember, NavLocation, NearbyPlace } from "@/types";

const SEPARATION_THRESHOLD_METERS = 2000;

export default function DashboardPage() {
  const { activeRide } = useRide();
  const groupRide = useGroupRide();

  // A real backend-joined ride takes priority over the Stage 1/2 mock ride.
  // Falls back to the mock demo ride only when the dashboard is opened with
  // no real ride active (e.g. "Explore map" from the landing page).
  const inRealRide = Boolean(groupRide.session && groupRide.ride);
  const mockRideFallback = activeRide ?? mockRide;

  const [tab, setTab] = useState<DashboardTab>("home");
  const [pendingDestination, setPendingDestination] = useState<NavLocation | null>(null);
  const [showWarmup, setShowWarmup] = useState(false);

  // RoutePlanner stays mounted across every tab (hidden with CSS, not
  // unmounted) — see git history for why: unmounting it previously raced
  // the ride's auto-geocode against a nearby-place "Navigate here" and
  // silently reverted the destination.
  const routePlannerVisible = tab === "home" || tab === "map" || tab === "ride";

  // "Navigate here" from the Nearby tab: hand the place straight to
  // RoutePlanner as the new destination (coordinates already known — no
  // extra geocoding needed) and jump to the map so the route is visible.
  function handleNavigateHere(place: NearbyPlace) {
    setPendingDestination({ label: place.name, coords: place.coords, source: "search" });
    setTab("map");
  }

  // Real group ride: feed the backend's already-resolved destination
  // coordinates straight in once per ride (never re-geocoded — the backend
  // is the source of truth for where everyone is headed).
  const seededRideIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (groupRide.ride && seededRideIdRef.current !== groupRide.ride.id) {
      seededRideIdRef.current = groupRide.ride.id;
      setPendingDestination({
        label: groupRide.ride.destination,
        coords: { lat: groupRide.ride.destinationLatitude, lng: groupRide.ride.destinationLongitude },
        source: "search",
      });
    }
  }, [groupRide.ride]);

  function handleNavigateToRider(member: GroupMember) {
    if (member.latitude === null || member.longitude === null) return;
    setPendingDestination({ label: member.name, coords: { lat: member.latitude, lng: member.longitude }, source: "search" });
    setTab("map");
  }

  const otherMembers = groupRide.members.filter((m) => m.riderId !== groupRide.session?.riderId);
  const coRiders: CoRiderMarker[] = otherMembers
    .filter((m) => m.latitude !== null && m.longitude !== null)
    .map((m) => {
      const distance =
        groupRide.myCoords && m.latitude !== null && m.longitude !== null
          ? haversineMeters(groupRide.myCoords, { lat: m.latitude, lng: m.longitude })
          : null;
      return {
        id: m.riderId,
        name: m.name,
        coords: { lat: m.latitude as number, lng: m.longitude as number },
        heading: m.heading,
        distanceLabel: distance !== null ? formatDistanceMeters(distance) : null,
        presence: derivePresence(m),
      };
    });

  const { alert: separationAlert, dismiss: dismissSeparationAlert } = useSeparationAlerts(
    inRealRide ? otherMembers : [],
    groupRide.myCoords,
    SEPARATION_THRESHOLD_METERS
  );

  const activeAlerts: string[] = [];
  if (groupRide.rideEndedNotice) activeAlerts.push("This ride has ended.");
  if (separationAlert) activeAlerts.push(`${separationAlert.name} is ${formatDistanceMeters(separationAlert.distanceMeters)} away from you.`);
  if (groupRide.error) activeAlerts.push(groupRide.error);

  const displayName = inRealRide ? groupRide.ride!.rideName : mockRideFallback.name;
  const displayCode = inRealRide ? groupRide.ride!.rideCode : mockRideFallback.id;
  const displayStart = inRealRide ? "Your current location" : mockRideFallback.startLocation || "Start not set";
  const displayDestination = inRealRide ? groupRide.ride!.destination : mockRideFallback.destination || "Destination not set";

  return (
    <div className="dashboard">
      <TopBar title={displayName} />

      <main className="dashboard__content dashboard__content--flush-top">
        {inRealRide && (
          <ConnectionStatusBanner isConnected={groupRide.isConnected} onRetry={groupRide.retryConnection} />
        )}
        {groupRide.rideEndedNotice && (
          <div className="separation-alert">
            <Flag size={16} />
            <span>This ride has ended.</span>
            <button className="separation-alert__dismiss" onClick={groupRide.acknowledgeRideEnded} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        )}
        {separationAlert && (
          <div className="separation-alert">
            <AlertTriangle size={16} />
            <span>
              ⚠️ {separationAlert.name} is {formatDistanceMeters(separationAlert.distanceMeters)} away from you.
            </span>
            <button className="separation-alert__dismiss" onClick={dismissSeparationAlert} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        )}
        {groupRide.error && (
          <div className="separation-alert">
            <AlertTriangle size={16} />
            <span>{groupRide.error}</span>
            <button className="separation-alert__dismiss" onClick={groupRide.clearError} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        )}

        <Card className="ride-summary">
          <div className="panel-header">
            <div className="panel-header__title">
              <h3>{displayName}</h3>
            </div>
            <span className="mono ride-summary__id">
              <Hash size={12} /> {displayCode}
            </span>
          </div>
          <p className="ride-summary__route">
            <span>{displayStart}</span>
            <ChevronRight size={14} />
            <span>{displayDestination}</span>
          </p>
        </Card>

        <div hidden={!routePlannerVisible}>
          <RoutePlanner
            rideStartLabel={inRealRide ? "" : mockRideFallback.startLocation}
            rideDestinationLabel={inRealRide ? "" : mockRideFallback.destination}
            pendingDestination={pendingDestination}
            onPendingDestinationHandled={() => setPendingDestination(null)}
            coRiders={coRiders}
            activeAlerts={activeAlerts}
            onOpenWarmup={() => setShowWarmup(true)}
            renderRidersPanel={
              inRealRide ? () => <GroupRidersPanel onNavigateToRider={handleNavigateToRider} /> : undefined
            }
          />
        </div>

        {showWarmup && <WarmupScreen onClose={() => setShowWarmup(false)} />}

        {(tab === "home" || tab === "map") && (
          <div className="dashboard__row">
            {inRealRide ? (
              <GroupRidersPanel onNavigateToRider={handleNavigateToRider} />
            ) : (
              <RidersPanel riders={mockRiders.slice(0, 3)} />
            )}
            <VoicePanel />
          </div>
        )}
        {(tab === "home" || tab === "map") && <MusicPlayerBar />}

        {tab === "ride" &&
          (inRealRide ? (
            <GroupRidersPanel onNavigateToRider={handleNavigateToRider} />
          ) : (
            <RidersPanel riders={mockRiders} />
          ))}

        {tab === "nearby" && <NearbyPanel onNavigateHere={handleNavigateHere} />}

        {tab === "more" && (
          <>
            <VoicePanel />
            <MusicPlayerBar />
          </>
        )}
      </main>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
