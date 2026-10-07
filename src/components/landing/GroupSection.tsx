import { Link } from "react-router-dom";
import { MapPinned, Ruler, Radio, Navigation2 } from "lucide-react";
import GroupMapMockup from "@/components/landing/GroupMapMockup";
import Reveal from "@/components/landing/Reveal";

const POINTS = [
  { icon: MapPinned, text: "Every rider's live position, on one map" },
  { icon: Ruler, text: "Real distance from you to each rider" },
  { icon: Radio, text: "Riding, stopped or offline — at a glance" },
  { icon: Navigation2, text: "Tap a rider and navigate straight to them" },
];

export default function GroupSection() {
  return (
    <section id="group" className="lp-section lp-group">
      <img className="lp-bg" src="/images/group-ride.webp" alt="" loading="lazy" decoding="async" />
      <div className="lp-group__scrim" />
      <div className="lp-container lp-grid-2">
        <Reveal>
          <span className="lp-eyebrow">Group riding</span>
          <h2 className="lp-h2">Never Lose Your Crew.</h2>
          <p className="lp-lead">See your riding group live on the map and stay connected throughout the ride.</p>
          <ul className="lp-points">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text}>
                <span className="lp-points__icon">
                  <Icon size={18} />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <Link to="/create-ride" className="btn btn--primary btn--lg">
            Start a ride
          </Link>
        </Reveal>
        <Reveal delay={120}>
          <GroupMapMockup />
        </Reveal>
      </div>
    </section>
  );
}
