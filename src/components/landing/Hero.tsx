import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useGroupRide } from "@/context/GroupRideContext";

export default function Hero() {
  const { session } = useGroupRide();
  return (
    <section className="lp-hero" aria-label="MotoNav">
      <img className="lp-hero__img" src="/images/hero-forest-road.webp" alt="" decoding="async" />
      <div className="lp-hero__scrim" />
      <div className="lp-hero__content">
        <span className="lp-eyebrow">Motorcycle navigation · Group riding</span>
        <h1 className="lp-hero__title">
          Ride Together.
          <br />
          <span>Navigate Further.</span>
        </h1>
        <p className="lp-hero__sub">
          Plan your route, ride with your crew, track every rider and discover everything you need along the way.
        </p>
        <div className="lp-hero__cta">
          <Link to="/create-ride" className="btn btn--primary btn--lg">
            Start a Ride
          </Link>
          <Link to="/join-ride" className="btn btn--secondary btn--lg">
            Join a Ride
          </Link>
          {session && (
            <Link to="/dashboard" className="lp-hero__resume">
              Resume your ride
            </Link>
          )}
        </div>
      </div>
      <a href="#group" className="lp-scroll" aria-label="Scroll to explore">
        <span>Scroll</span>
        <ChevronDown size={18} />
      </a>
    </section>
  );
}
