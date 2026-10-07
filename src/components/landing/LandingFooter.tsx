import { Link } from "react-router-dom";
import Logo from "@/components/common/Logo";

export default function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-container lp-footer__inner">
        <Logo />
        <nav aria-label="Footer">
          <Link to="/create-ride">Start a ride</Link>
          <Link to="/join-ride">Join a ride</Link>
          <Link to="/dashboard">Open the map</Link>
        </nav>
        <span className="lp-footer__copy">© {new Date().getFullYear()} MotoNav. Ride safe.</span>
      </div>
    </footer>
  );
}
