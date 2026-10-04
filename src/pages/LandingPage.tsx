import { useNavigate } from "react-router-dom";
import { Users, MapPinned, Radio, Music2, ShieldAlert, Fuel } from "lucide-react";
import Logo from "@/components/common/Logo";
import Button from "@/components/common/Button";

const FEATURES = [
  { icon: Users, title: "Ride together", copy: "See every rider's position and status on one shared map." },
  { icon: MapPinned, title: "Nearby stops", copy: "Fuel, food, hotels, mechanics and more, sorted by the route." },
  { icon: Radio, title: "Group voice", copy: "Push-to-talk comms that keep the whole group in sync." },
  { icon: Music2, title: "Synced music", copy: "Play the same soundtrack for everyone, mile after mile." },
  { icon: ShieldAlert, title: "SOS ready", copy: "One tap alerts your group and shares your exact location." },
  { icon: Fuel, title: "Never guess a stop", copy: "Real-time fuel range and rest-stop planning on the go." },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      <header className="landing__nav">
        <Logo />
      </header>

      <section className="landing__hero">
        <svg className="landing__route-line" viewBox="0 0 1200 220" preserveAspectRatio="none" aria-hidden="true">
          <path
            d="M -20 180 C 200 40, 380 220, 600 100 S 900 -20, 1220 60"
            fill="none"
            stroke="url(#heroGrad)"
            strokeWidth="3"
            strokeDasharray="1 16"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#FF6A33" />
              <stop offset="100%" stopColor="#FFB627" />
            </linearGradient>
          </defs>
        </svg>

        <span className="landing__eyebrow">Group riding, sorted.</span>
        <h1 className="landing__headline">
          One route.
          <br />
          Every rider.
          <br />
          <span className="landing__headline--accent">Zero guesswork.</span>
        </h1>
        <p className="landing__subhead">
          MotoNav keeps your whole riding group on the same map, the same voice channel, and the same
          playlist — with fuel, food and rest stops planned along the way.
        </p>

        <div className="landing__cta-row">
          <Button size="lg" onClick={() => navigate("/create-ride")}>
            Create ride
          </Button>
          <Button size="lg" variant="secondary" onClick={() => navigate("/join-ride")}>
            Join ride
          </Button>
          <Button size="lg" variant="ghost" onClick={() => navigate("/dashboard")}>
            Explore map
          </Button>
        </div>
      </section>

      <section className="landing__features">
        {FEATURES.map(({ icon: Icon, title, copy }) => (
          <div className="feature-card" key={title}>
            <div className="feature-card__icon">
              <Icon size={22} strokeWidth={2} />
            </div>
            <h3>{title}</h3>
            <p>{copy}</p>
          </div>
        ))}
      </section>

      <footer className="landing__footer">
        <span>MotoNav — built for the road ahead.</span>
      </footer>
    </div>
  );
}
