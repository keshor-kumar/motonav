import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { FamousRoute } from "@/data/famousRoutes";
import type { Coordinates } from "@/types";

/** Router state understood by DashboardPage: pre-fill origin + destination and open the Route panel. */
export interface StartRouteState {
  startRoute: {
    origin: { label: string; coords: Coordinates };
    destination: { label: string; coords: Coordinates };
  };
}

/**
 * "Start This Route": hands the ride's start and destination to the EXISTING dashboard, which routes
 * them with the existing routing service and runs the existing navigation interface.
 */
export function useStartRoute() {
  const navigate = useNavigate();
  return useCallback(
    (route: FamousRoute) => {
      const state: StartRouteState = {
        startRoute: {
          origin: { label: route.start.name, coords: route.start.coords },
          destination: { label: route.destination.name, coords: route.destination.coords },
        },
      };
      navigate("/dashboard", { state });
    },
    [navigate]
  );
}
