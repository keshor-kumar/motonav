import { useId, useMemo } from "react";
import type { LatLng } from "@/data/famousRoutes";

interface RouteTraceProps {
  points: LatLng[];
  /** Accessible description, e.g. "Route line from Chennai to Ooty". */
  label: string;
}

const W = 320;
const H = 120;
const PAD = 16;

/**
 * Lightweight map preview: the ride's real coordinates projected onto a small dark SVG panel.
 * It costs nothing (no tiles, no WebGL context, no API call), so ten of them can sit on one page
 * and still scroll smoothly on a phone. The full MapTiler map is on the ride's detail page.
 */
export default function RouteTrace({ points, label }: RouteTraceProps) {
  const gridId = `trace-grid-${useId().replace(/:/g, "")}`;
  const { d, start, end } = useMemo(() => {
    const lats = points.map((p) => p[0]);
    const lngs = points.map((p) => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const midLat = (minLat + maxLat) / 2;
    const kx = Math.cos((midLat * Math.PI) / 180); // equirectangular: shrink longitude with latitude
    const spanX = Math.max((maxLng - minLng) * kx, 1e-6);
    const spanY = Math.max(maxLat - minLat, 1e-6);
    const scale = Math.min((W - PAD * 2) / spanX, (H - PAD * 2) / spanY);
    const offX = (W - spanX * scale) / 2;
    const offY = (H - spanY * scale) / 2;
    const xy = points.map(([lat, lng]) => [offX + (lng - minLng) * kx * scale, offY + (maxLat - lat) * scale] as const);
    return {
      d: xy.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" "),
      start: xy[0],
      end: xy[xy.length - 1],
    };
  }, [points]);

  return (
    <svg className="trace" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id={gridId} width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill={`url(#${gridId})`} />
      <path d={d} className="trace__glow" />
      <path d={d} className="trace__line" />
      <circle cx={start[0]} cy={start[1]} r="5" className="trace__start" />
      <circle cx={end[0]} cy={end[1]} r="6" className="trace__end" />
      <circle cx={end[0]} cy={end[1]} r="2.2" fill="#fff" />
    </svg>
  );
}
