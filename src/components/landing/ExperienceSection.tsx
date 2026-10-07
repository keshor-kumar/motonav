import Reveal from "@/components/landing/Reveal";

const STATS = [
  { value: "1,248", unit: "km", label: "Distance ridden" },
  { value: "36", unit: "h", label: "Time riding" },
  { value: "14", unit: "", label: "Routes explored" },
  { value: "52", unit: "", label: "Places discovered" },
];

export default function ExperienceSection() {
  return (
    <section id="story" className="lp-section lp-story">
      <img className="lp-bg" src="/images/sunset-viewpoint.webp" alt="" loading="lazy" decoding="async" />
      <div className="lp-story__scrim" />
      <div className="lp-container">
        <Reveal className="lp-center">
          <span className="lp-eyebrow">The ride experience</span>
          <h2 className="lp-h2">Every Road Becomes A Story.</h2>
        </Reveal>
        <div className="lp-stats">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 80}>
              <div className="lp-stat">
                <span className="lp-stat__value">
                  {s.value}
                  {s.unit && <small>{s.unit}</small>}
                </span>
                <span className="lp-stat__label">{s.label}</span>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="lp-note lp-center">Sample ride log — your own totals build up as you ride.</p>
      </div>
    </section>
  );
}
