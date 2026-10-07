import MotorcycleIcon from "@/components/common/MotorcycleIcon";

interface MockRider {
  name: string;
  distance: string | null;
  status: "riding" | "stopped";
  x: number;
  y: number;
  you?: boolean;
}

const RIDERS: MockRider[] = [
  { name: "Keshor", distance: null, status: "riding", x: 46, y: 58, you: true },
  { name: "Rahul", distance: "0.8 km", status: "riding", x: 30, y: 40 },
  { name: "Arjun", distance: "1.2 km", status: "riding", x: 66, y: 28 },
  { name: "Vijay", distance: "2.4 km", status: "stopped", x: 78, y: 12 },
];

const STATUS_LABEL = { riding: "Riding", stopped: "Stopped" } as const;

/** Illustrative preview of the live group map (sample riders — the real thing uses live GPS over Socket.IO). */
export default function GroupMapMockup() {
  return (
    <figure className="mock-map">
      <svg className="mock-map__roads" viewBox="0 0 400 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="400" height="520" fill="#0b0b0b" />
        {[60, 150, 240, 330, 420].map((y) => (
          <path key={y} d={`M-10 ${y} H410`} stroke="#141414" strokeWidth="1" />
        ))}
        {[50, 130, 210, 290, 370].map((x) => (
          <path key={x} d={`M${x} -10 V530`} stroke="#141414" strokeWidth="1" />
        ))}
        <path d="M-20 420 C 90 380, 130 330, 200 300 S 320 210, 430 90" stroke="#1c1c1c" strokeWidth="16" fill="none" strokeLinecap="round" />
        <path d="M-20 420 C 90 380, 130 330, 200 300 S 320 210, 430 90" stroke="#e10600" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="1 10" />
        <path d="M60 -10 C 90 120, 40 200, 120 280 S 150 440, 190 530" stroke="#171717" strokeWidth="10" fill="none" />
      </svg>

      {RIDERS.map((r) => (
        <div
          key={r.name}
          className={`mock-marker ${r.you ? "mock-marker--you" : ""} ${r.status === "stopped" ? "mock-marker--stopped" : ""}`}
          style={{ left: `${r.x}%`, top: `${r.y}%` }}
        >
          <span className="mock-marker__bike">
            <MotorcycleIcon size={18} />
          </span>
          <span className="mock-marker__label">
            {r.name}
            {r.distance ? ` · ${r.distance}` : " · You"}
          </span>
        </div>
      ))}

      <div className="mock-map__list">
        {RIDERS.map((r) => (
          <div key={r.name} className="mock-map__row">
            <span className={`crew-rider__icon crew-rider__icon--${r.status}`}>
              <MotorcycleIcon size={18} />
            </span>
            <span className="mock-map__name">{r.name}</span>
            <span className={`crew-rider__status crew-rider__status--${r.status}`}>{r.you ? "You" : STATUS_LABEL[r.status]}</span>
            <span className="mock-map__dist">{r.distance ?? ""}</span>
          </div>
        ))}
      </div>
      <figcaption className="mock-caption">Illustrative preview</figcaption>
    </figure>
  );
}
