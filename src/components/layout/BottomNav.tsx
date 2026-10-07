import { Home, Map, Navigation2, Coffee, Menu } from "lucide-react";
import type { DashboardTab } from "@/types";

const TABS: { id: DashboardTab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "map", label: "Map", icon: Map },
  { id: "ride", label: "Ride", icon: Navigation2 },
  { id: "nearby", label: "Nearby", icon: Coffee },
  { id: "more", label: "More", icon: Menu },
];

interface BottomNavProps {
  active: DashboardTab;
  onChange: (tab: DashboardTab) => void;
}

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`bottom-nav__item ${active === id ? "bottom-nav__item--active" : ""}`}
          onClick={() => onChange(id)}
          aria-current={active === id ? "page" : undefined}
        >
          <Icon size={22} strokeWidth={active === id ? 2.4 : 1.8} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
