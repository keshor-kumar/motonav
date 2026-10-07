import { useState } from "react";
import { Dumbbell, Droplet, Fuel, Disc, CloudSun, Route as RouteIcon, Play } from "lucide-react";
import Reveal from "@/components/landing/Reveal";
import WarmupScreen from "@/components/warmup/WarmupScreen";
import WarmupIllustration from "@/components/warmup/WarmupIllustration";
import { WARMUP_EXERCISES } from "@/data/warmupExercises";

const CHECKS = [
  { icon: Dumbbell, label: "Warm-up" },
  { icon: Droplet, label: "Hydration" },
  { icon: Fuel, label: "Fuel check" },
  { icon: Disc, label: "Tyre check" },
  { icon: CloudSun, label: "Weather check" },
  { icon: RouteIcon, label: "Route check" },
];

export default function PreRideSection() {
  const [open, setOpen] = useState(false);
  return (
    <section id="pre-ride" className="lp-section lp-preride">
      <img className="lp-bg" src="/images/bare-trees.webp" alt="" loading="lazy" decoding="async" />
      <div className="lp-preride__scrim" />
      <div className="lp-container">
        <Reveal className="lp-center">
          <span className="lp-eyebrow">Pre-ride</span>
          <h2 className="lp-h2">Before You Ride.</h2>
          <p className="lp-lead">A few minutes now makes the whole day better. Loosen up, check the bike, then go.</p>
        </Reveal>

        <Reveal delay={80}>
          <ul className="lp-checks">
            {CHECKS.map(({ icon: Icon, label }) => (
              <li key={label}>
                <Icon size={18} /> {label}
              </li>
            ))}
          </ul>
        </Reveal>

        <div className="lp-warm-grid">
          {WARMUP_EXERCISES.map((ex, i) => (
            <Reveal key={ex.id} delay={i * 60}>
              <article className="lp-warm">
                <div className="lp-warm__art">
                  <WarmupIllustration exerciseId={ex.id} />
                </div>
                <h3>{ex.name}</h3>
                <p>{ex.durationSeconds} seconds</p>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal className="lp-center">
          <button type="button" className="btn btn--primary btn--lg" onClick={() => setOpen(true)}>
            <Play size={18} /> Start warm-up
          </button>
          <p className="lp-note">A general warm-up, not medical advice. Stop if you feel pain or dizziness.</p>
        </Reveal>
      </div>
      {open && <WarmupScreen onClose={() => setOpen(false)} />}
    </section>
  );
}
