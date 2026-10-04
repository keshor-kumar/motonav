import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { RideInfo } from "@/types";

// ============================================================
// Stage 1: shares the "active ride" (created or joined) across
// pages using React state, persisted to localStorage so it
// survives a refresh. No backend/database involved — Stage 2+
// will replace the localStorage persistence with a real API/session.
// ============================================================

const STORAGE_KEY = "motonav.activeRide";

interface RideContextValue {
  activeRide: RideInfo | null;
  setActiveRide: (ride: RideInfo | null) => void;
}

const RideContext = createContext<RideContextValue | undefined>(undefined);

function readStoredRide(): RideInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RideInfo) : null;
  } catch {
    return null;
  }
}

export function RideProvider({ children }: { children: ReactNode }) {
  const [activeRide, setActiveRideState] = useState<RideInfo | null>(() => readStoredRide());

  const setActiveRide = (ride: RideInfo | null) => {
    setActiveRideState(ride);
  };

  useEffect(() => {
    try {
      if (activeRide) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(activeRide));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // localStorage may be unavailable (private browsing, etc.) — non-fatal for Stage 1.
    }
  }, [activeRide]);

  return <RideContext.Provider value={{ activeRide, setActiveRide }}>{children}</RideContext.Provider>;
}

export function useRide() {
  const ctx = useContext(RideContext);
  if (!ctx) throw new Error("useRide must be used within a RideProvider");
  return ctx;
}
