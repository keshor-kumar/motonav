import { CornerUpRight, Ruler, Signpost, Route as RouteIcon, Clock, Navigation2 } from "lucide-react";
import MotorcycleIcon from "@/components/common/MotorcycleIcon";
import Reveal from "@/components/landing/Reveal";
import TurnInstruction from "@/components/navigation/guidance/TurnInstruction";
import SpeedDisplay from "@/components/navigation/guidance/SpeedDisplay";
import CurrentRoad from "@/components/navigation/guidance/CurrentRoad";
import RouteProgress from "@/components/navigation/guidance/RouteProgress";
import ETA from "@/components/navigation/guidance/ETA";

const DEMO_ETA = (() => {
  const d = new Date();
  d.setHours(17, 42, 0, 0);
  return d;
})();

const READS = [
  { icon: CornerUpRight, title: "Maneuver & direction", text: "Left, right, bear, U-turn, roundabout — from the route itself." },
  { icon: Ruler, title: "Distance to the turn", text: "Counted along the route line as you ride, not as the crow flies." },
  { icon: Signpost, title: "Current road", text: "The road you're on, when the route provides it." },
  { icon: RouteIcon, title: "Route progress", text: "Remaining distance and a live progress bar." },
  { icon: Clock, title: "ETA", text: "Arrival time that moves with your real progress." },
  { icon: Navigation2, title: "Speed & heading", text: "From your phone's GPS. The map turns with you." },
];

export default function NavigationSection() {
  return (
    <section id="navigation" className="lp-section lp-nav-section">
      <div className="lp-container lp-grid-2 lp-grid-2--phone">
        <Reveal className="lp-phone-wrap">
          <div className="mock-phone" aria-label="Illustrative preview of the navigation screen">
            <div className="mock-phone__screen">
              <div className="mock-phone__top">
                <TurnInstruction maneuver="right" distanceMeters={300} secondary="NH 44" />
              </div>
              <svg className="mock-phone__map" viewBox="0 0 240 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                <rect width="240" height="360" fill="#0b0b0b" />
                <path d="M120 400 C 120 300, 90 250, 130 190 S 200 120, 230 40" stroke="#1d1d1d" strokeWidth="22" fill="none" strokeLinecap="round" />
                <path d="M120 400 C 120 300, 90 250, 130 190 S 200 120, 230 40" stroke="#ff2a1f" strokeWidth="4" fill="none" strokeLinecap="round" />
                <path d="M-10 120 C 60 140, 100 190, 130 190" stroke="#161616" strokeWidth="12" fill="none" />
              </svg>
              <span className="mock-phone__bike">
                <MotorcycleIcon size={22} />
              </span>
              <div className="gd-sheet gd-sheet--mock">
                <div className="gd-sheet__top">
                  <SpeedDisplay speedKph={72} />
                  <CurrentRoad name="NH 44" />
                </div>
                <ETA etaDate={DEMO_ETA} remainingMeters={32000} remainingSeconds={1740} />
                <RouteProgress progress={0.42} />
              </div>
            </div>
            <span className="mock-caption">Illustrative preview · sample values</span>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <span className="lp-eyebrow">Navigation</span>
          <h2 className="lp-h2">Built Like A Riding Computer.</h2>
          <p className="lp-lead">
            A full-screen map, one big next-turn card up top, and the numbers that matter at the bottom. Nothing to hunt for with gloves on.
          </p>
          <ul className="lp-reads">
            {READS.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <span className="lp-points__icon">
                  <Icon size={18} />
                </span>
                <div>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="lp-note">The preview shows sample values. In the app every figure comes from your live GPS and the route that was calculated.</p>
        </Reveal>
      </div>
    </section>
  );
}
