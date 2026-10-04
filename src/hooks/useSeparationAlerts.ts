import { useEffect, useRef, useState } from "react";
import { haversineMeters } from "@/utils/geo";
import type { Coordinates, GroupMember } from "@/types";

// ============================================================
// Warns when a co-rider drifts farther than a configurable
// threshold from the current rider's position. Each rider gets
// its own cooldown so one far-away rider doesn't spam a new
// alert on every single location update.
// ============================================================

export interface SeparationAlert {
  riderId: string;
  name: string;
  distanceMeters: number;
}

const ALERT_COOLDOWN_MS = 2 * 60 * 1000; // re-alert for the same rider at most once every 2 minutes

export function useSeparationAlerts(
  members: GroupMember[],
  myCoords: Coordinates | null,
  thresholdMeters: number
) {
  const [alert, setAlert] = useState<SeparationAlert | null>(null);
  const lastAlertedRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!myCoords || thresholdMeters <= 0) return;
    const now = Date.now();

    for (const member of members) {
      if (member.latitude === null || member.longitude === null) continue;
      const distance = haversineMeters(myCoords, { lat: member.latitude, lng: member.longitude });
      if (distance <= thresholdMeters) continue;

      const lastAlerted = lastAlertedRef.current.get(member.riderId) ?? 0;
      if (now - lastAlerted < ALERT_COOLDOWN_MS) continue;

      lastAlertedRef.current.set(member.riderId, now);
      setAlert({ riderId: member.riderId, name: member.name, distanceMeters: distance });
      break; // one alert at a time — don't stack multiple banners
    }
  }, [members, myCoords, thresholdMeters]);

  const dismiss = () => setAlert(null);

  return { alert, dismiss };
}
