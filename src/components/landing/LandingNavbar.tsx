import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Logo from "@/components/common/Logo";

const LINKS = [
  { label: "Ride", to: "/dashboard", external: false },
  { label: "Explore", to: "#discover", external: true },
  { label: "Features", to: "#group", external: true },
  { label: "Safety", to: "#safety", external: true },
];

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      setScrolled(window.scrollY > 40);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`lp-nav ${scrolled || open ? "lp-nav--solid" : ""}`}>
      <div className="lp-nav__inner">
        <Link to="/" className="lp-nav__brand" aria-label="MotoNav home">
          <Logo />
        </Link>

        <nav className={`lp-nav__links ${open ? "lp-nav__links--open" : ""}`} aria-label="Main">
          {LINKS.map((l) =>
            l.external ? (
              <a key={l.label} href={l.to} onClick={() => setOpen(false)}>
                {l.label}
              </a>
            ) : (
              <Link key={l.label} to={l.to} onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            )
          )}
          <div className="lp-nav__cta lp-nav__cta--mobile">
            <Link to="/join-ride" className="btn btn--secondary btn--lg btn--full">
              Join ride
            </Link>
            <Link to="/create-ride" className="btn btn--primary btn--lg btn--full">
              Start ride
            </Link>
          </div>
        </nav>

        <div className="lp-nav__cta">
          <Link to="/join-ride" className="btn btn--ghost btn--md">
            Join ride
          </Link>
          <Link to="/create-ride" className="btn btn--primary btn--md">
            Start ride
          </Link>
        </div>

        <button type="button" className="lp-nav__burger" onClick={() => setOpen((v) => !v)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </header>
  );
}
