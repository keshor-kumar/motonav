import { Link, NavLink } from "react-router-dom";
import { Compass, Map as MapIcon, Newspaper, Users } from "lucide-react";
import Logo from "@/components/common/Logo";

const ITEMS = [
  { to: "/news", label: "News", Icon: Newspaper },
  { to: "/routes", label: "Rides", Icon: MapIcon },
  { to: "/community", label: "Community", Icon: Users },
] as const;

/**
 * Shared header for the content pages (News, Famous Rides, Community). Sticky *in flow* — it occupies
 * its own row, so it never covers page content. On phones the links sit in a scrollable pill row
 * under the logo so every destination is one tap away.
 */
export default function SiteHeader() {
  return (
    <header className="sh">
      <div className="sh__row">
        <Link to="/" className="sh__brand" aria-label="MotoNav home">
          <Logo compact />
        </Link>
        <nav className="sh__links" aria-label="Sections">
          {ITEMS.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `sh__link ${isActive ? "sh__link--active" : ""}`}>
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <Link to="/dashboard" className="btn btn--primary btn--md sh__cta">
          <Compass size={16} aria-hidden="true" /> Ride
        </Link>
      </div>
    </header>
  );
}
