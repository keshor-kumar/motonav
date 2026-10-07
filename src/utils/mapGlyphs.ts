// Inline SVG markup for MapLibre marker elements (plain DOM, so no React/Lucide here).
// Strokes use currentColor so CSS controls the color.

const svg = (inner: string, size = 22) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

/** Motorcycle seen from above, pointing up (north) — rotated to the rider's heading. */
export const MOTO_TOPDOWN_SVG = svg(
  '<rect x="10.4" y="1.8" width="3.2" height="6" rx="1.6"/><path d="M5.5 8.6h13"/><path d="M12 8.2v3"/><ellipse cx="12" cy="13.6" rx="3.2" ry="3.8"/><rect x="10.4" y="17.6" width="3.2" height="4.8" rx="1.6"/>'
);

export const FLAG_SVG = svg('<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>', 18);
