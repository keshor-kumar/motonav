// Simple, original line-art illustrations (hand-drawn SVG paths) for each
// warm-up exercise — not scraped/copied from anywhere, no licensing concern.
// Deliberately minimal (stick-figure style) rather than photorealistic.

const STROKE = { stroke: "var(--accent-ember)", strokeWidth: 3, strokeLinecap: "round" as const, fill: "none" };
const BODY = { stroke: "var(--text-secondary)", strokeWidth: 3, strokeLinecap: "round" as const, fill: "none" };

function Head({ cx, cy }: { cx: number; cy: number }) {
  return <circle cx={cx} cy={cy} r="10" {...BODY} />;
}

export default function WarmupIllustration({ exerciseId }: { exerciseId: string }) {
  const common = { viewBox: "0 0 160 160", width: "100%", height: "100%" };

  switch (exerciseId) {
    case "neck":
      return (
        <svg {...common} aria-hidden="true">
          <Head cx={80} cy={55} />
          <path d="M80 65 L80 110" {...BODY} />
          <path d="M55 130 L80 110 L105 130" {...BODY} />
          <path d="M65 40 A 20 20 0 0 1 95 40" {...STROKE} />
          <path d="M95 40 l-6 -4 M95 40 l-2 7" {...STROKE} />
        </svg>
      );
    case "shoulders":
      return (
        <svg {...common} aria-hidden="true">
          <Head cx={80} cy={45} />
          <path d="M80 55 L80 110" {...BODY} />
          <path d="M55 130 L80 110 L105 130" {...BODY} />
          <circle cx={55} cy={70} r="16" {...STROKE} />
          <circle cx={105} cy={70} r="16" {...STROKE} />
        </svg>
      );
    case "wrists":
      return (
        <svg {...common} aria-hidden="true">
          <Head cx={80} cy={40} />
          <path d="M80 50 L80 110" {...BODY} />
          <path d="M55 130 L80 110 L105 130" {...BODY} />
          <path d="M80 65 L40 85" {...BODY} />
          <path d="M80 65 L120 85" {...BODY} />
          <circle cx={40} cy={85} r="12" {...STROKE} />
          <circle cx={120} cy={85} r="12" {...STROKE} />
        </svg>
      );
    case "torso":
      return (
        <svg {...common} aria-hidden="true">
          <Head cx={80} cy={40} />
          <path d="M80 50 L70 110" {...BODY} />
          <path d="M45 130 L70 110 L95 130" {...BODY} />
          <path d="M70 70 L40 60 M70 70 L100 80" {...STROKE} />
          <path d="M40 60 l8 -3 M40 60 l2 8" {...STROKE} />
        </svg>
      );
    case "legs":
      return (
        <svg {...common} aria-hidden="true">
          <Head cx={70} cy={35} />
          <path d="M70 45 L70 95" {...BODY} />
          <path d="M50 95 L70 95 L95 95" {...BODY} />
          <path d="M70 95 L55 140" {...BODY} />
          <path d="M70 95 Q100 110 110 140" {...STROKE} />
          <path d="M110 140 l-10 -3 M110 140 l-4 -9" {...STROKE} />
        </svg>
      );
    case "ankles":
      return (
        <svg {...common} aria-hidden="true">
          <Head cx={70} cy={35} />
          <path d="M70 45 L70 100" {...BODY} />
          <path d="M55 100 L70 100 L90 100" {...BODY} />
          <path d="M70 100 L65 135" {...BODY} />
          <ellipse cx={95} cy={135} rx="16" ry="8" {...STROKE} />
        </svg>
      );
    default:
      return (
        <svg {...common} aria-hidden="true">
          <Head cx={80} cy={55} />
          <path d="M80 65 L80 130" {...BODY} />
        </svg>
      );
  }
}
