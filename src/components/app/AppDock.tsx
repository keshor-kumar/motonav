import { Route as RouteIcon, Users, Compass, Menu } from "lucide-react";

export type DashTab = "route" | "crew" | "nearby" | "more";

const TABS: { id: DashTab; label: string; icon: typeof Users }[] = [
  { id: "route", label: "Route", icon: RouteIcon },
  { id: "crew", label: "Crew", icon: Users },
  { id: "nearby", label: "Nearby", icon: Compass },
  { id: "more", label: "More", icon: Menu },
];

interface AppDockProps {
  active: DashTab;
  sheetOpen: boolean;
  crewCount: number;
  onSelect: (tab: DashTab) => void;
}

export default function AppDock({ active, sheetOpen, crewCount, onSelect }: AppDockProps) {
  return (
    <nav className="app-dock" aria-label="Primary">
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id && sheetOpen;
        return (
          <button key={id} type="button" className={`app-dock__item ${isActive ? "app-dock__item--active" : ""}`} onClick={() => onSelect(id)} aria-current={isActive ? "page" : undefined}>
            <span className="app-dock__icon">
              <Icon size={22} strokeWidth={isActive ? 2.4 : 1.9} />
              {id === "crew" && crewCount > 1 && <span className="app-dock__badge">{crewCount}</span>}
            </span>
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
