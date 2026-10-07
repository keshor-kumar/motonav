import { Link } from "react-router-dom";
import Reveal from "@/components/landing/Reveal";

export default function FinalCta() {
  return (
    <section className="lp-section lp-final">
      <img className="lp-bg" src="/images/fog-rider.webp" alt="" loading="lazy" decoding="async" />
      <div className="lp-final__scrim" />
      <div className="lp-container lp-center">
        <Reveal>
          <h2 className="lp-h2 lp-h2--xl">
            Your Next Ride
            <br />
            Starts Here.
          </h2>
          <div className="lp-hero__cta lp-hero__cta--center">
            <Link to="/create-ride" className="btn btn--primary btn--lg">
              Start a ride
            </Link>
            <Link to="/join-ride" className="btn btn--secondary btn--lg">
              Join a ride
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
