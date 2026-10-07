import { useState } from "react";
import { Link } from "react-router-dom";
import Reveal from "@/components/landing/Reveal";
import { NEARBY_CATEGORY_META, NEARBY_CATEGORY_ORDER } from "@/components/nearby/categoryMeta";
import type { PlaceCategory } from "@/types";

const DETAIL: Record<PlaceCategory, string> = {
  fuel: "Petrol stations around your live position, nearest first — pick one and ride straight to it.",
  food: "Restaurants and dhabas close by, with real distances from where you are.",
  coffee: "Tea and coffee stops for a quick break between climbs.",
  hotel: "Hotels and stays near you or near where today's ride ends.",
  restroom: "Restrooms nearby, for when the next stop can't wait.",
  mechanic: "Vehicle repair shops close to you if something goes wrong.",
  hospital: "Hospitals around you, one tap from a route.",
  parking: "Parking near your stop or destination.",
  shop: "Convenience stores and shops for water, snacks and supplies.",
  scenic: "Sights and viewpoints close to your route worth a detour.",
};

export default function DiscoverSection() {
  const [active, setActive] = useState<PlaceCategory | null>(null);
  const meta = active ? NEARBY_CATEGORY_META[active] : null;

  return (
    <section id="discover" className="lp-section lp-discover">
      <img className="lp-bg" src="/images/motion-road.webp" alt="" loading="lazy" decoding="async" />
      <div className="lp-discover__scrim" />
      <div className="lp-container">
        <Reveal className="lp-center">
          <span className="lp-eyebrow">Discover the road</span>
          <h2 className="lp-h2">More Than Just A Route.</h2>
          <p className="lp-lead">Find fuel, food, rest and help along the way — based on where you actually are.</p>
        </Reveal>

        <Reveal delay={100}>
          <div className="lp-cats" role="tablist" aria-label="Place categories">
            {NEARBY_CATEGORY_ORDER.map((cat) => {
              const { label, icon: Icon } = NEARBY_CATEGORY_META[cat];
              const selected = active === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="discover-panel"
                  className={`lp-cat ${selected ? "lp-cat--active" : ""}`}
                  onClick={() => setActive(selected ? null : cat)}
                >
                  <Icon size={24} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <div id="discover-panel" className={`lp-cat-panel ${active ? "lp-cat-panel--open" : ""}`} role="tabpanel">
            {active && meta && (
              <div className="lp-cat-panel__inner">
                <p>{DETAIL[active]}</p>
                <Link to={`/dashboard?tab=nearby&cat=${active}`} className="btn btn--primary btn--md">
                  Find {meta.label.toLowerCase()} near me
                </Link>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
