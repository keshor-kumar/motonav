import { Users, ShieldAlert, AlertTriangle, Share2, Cross, Wrench, CloudSun } from "lucide-react";
import Reveal from "@/components/landing/Reveal";
import SosButton from "@/components/app/SosButton";

const FEATURES = [
  { icon: Users, title: "Live rider tracking", text: "Know where everyone is, all the time." },
  { icon: ShieldAlert, title: "SOS", text: "Hold to open emergency options — call 112, share your location, find a hospital." },
  { icon: AlertTriangle, title: "Rider separation alerts", text: "A warning when someone drifts beyond the distance you choose." },
  { icon: Share2, title: "Emergency location sharing", text: "Send a map link of exactly where you are, in two taps." },
  { icon: Cross, title: "Nearby hospitals", text: "Real places around your live position." },
  { icon: Wrench, title: "Nearby mechanics", text: "Repair shops close to wherever you stopped." },
  { icon: CloudSun, title: "Weather awareness", text: "Current conditions for where you are." },
];

export default function SafetySection() {
  return (
    <section id="safety" className="lp-section lp-safety">
      <img className="lp-bg lp-bg--mono" src="/images/mist-monochrome.webp" alt="" loading="lazy" decoding="async" />
      <div className="lp-safety__scrim" />
      <div className="lp-container lp-grid-2">
        <Reveal>
          <span className="lp-eyebrow">Safety</span>
          <h2 className="lp-h2">
            Ride Further.
            <br />
            Ride Smarter.
          </h2>
          <ul className="lp-safety-list">
            {FEATURES.map(({ icon: Icon, title, text }) => (
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
        </Reveal>
        <Reveal delay={120} className="lp-sos-wrap">
          <SosButton />
          <p className="lp-note">
            SOS is a hold-to-open control so it can't fire by accident. It helps you reach emergency services and share your location — MotoNav doesn't alert your crew or services automatically yet.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
