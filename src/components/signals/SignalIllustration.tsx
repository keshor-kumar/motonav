import type { ReactNode } from "react";
import type { PoseId } from "@/data/riderSignals";

// Original line-art: a rider seen from behind. The arm making the signal is drawn in racing red,
// the other arm stays on the handlebar. Deliberately simple so it reads at phone size.

type Pt = readonly [number, number];
type HandKind = "open" | "fist" | "point" | "one" | "two" | "thumb";

interface Arm {
  points: readonly Pt[];
  hand: { at: Pt; kind: HandKind; angle?: number };
}
interface Pose {
  left?: Arm;
  right?: Arm;
  extras?: ReactNode;
}

const IDLE_LEFT: Arm = { points: [[78, 66], [62, 84], [52, 92]], hand: { at: [50, 92], kind: "fist" } };
const IDLE_RIGHT: Arm = { points: [[122, 66], [138, 84], [148, 92]], hand: { at: [150, 92], kind: "fist" } };

const RED = "#e10600";
const HOT = "#ff2a1f";

const path = (pts: readonly Pt[]) => pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ");

function Hand({ at, kind, angle = 0, active }: { at: Pt; kind: HandKind; angle?: number; active: boolean }) {
  const c = active ? "#ffffff" : "#8a8a8a";
  return (
    <g transform={`translate(${at[0]} ${at[1]}) rotate(${angle})`} stroke={c} fill="#111" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      {kind === "open" && <rect x={-6} y={-9} width={12} height={17} rx={4} />}
      {kind !== "open" && <circle r={6.5} />}
      {(kind === "point" || kind === "one") && <path d="M0 -6V-18" />}
      {kind === "two" && <path d="M-3 -6V-18M3 -6V-18" />}
      {kind === "thumb" && <path d="M3 -5L6 -14" />}
    </g>
  );
}

function Warn({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={HOT} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M0 -12L13 10H-13Z" />
      <path d="M0 -3V3" />
      <path d="M0 7.5V7.6" />
    </g>
  );
}

const motion = (d: string) => <path d={d} stroke={HOT} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray="1 0" />;

const POSES: Record<PoseId, Pose> = {
  "slow-down": {
    left: { points: [[78, 68], [48, 72], [18, 76]], hand: { at: [11, 76], kind: "open" } },
    extras: <>{motion("M14 58V50M10 54L14 50L18 54")}{motion("M14 94V102M10 98L14 102L18 98")}</>,
  },
  stop: { left: { points: [[78, 66], [56, 88], [38, 112]], hand: { at: [34, 120], kind: "open", angle: 20 } } },
  "speed-up": {
    left: { points: [[78, 66], [48, 56], [20, 42]], hand: { at: [14, 38], kind: "open", angle: -20 } },
    extras: motion("M14 28V12M9 17L14 12L19 17"),
  },
  "left-turn": {
    left: { points: [[78, 66], [48, 66], [18, 66]], hand: { at: [11, 66], kind: "open", angle: -90 } },
    extras: motion("M34 44H12M18 38L12 44L18 50"),
  },
  "right-turn": {
    left: { points: [[78, 66], [50, 66], [50, 34]], hand: { at: [50, 26], kind: "open" } },
    extras: motion("M60 16H80M74 10L80 16L74 22"),
  },
  "follow-me": {
    left: { points: [[78, 66], [62, 40], [58, 12]], hand: { at: [58, 6], kind: "open" } },
    extras: motion("M38 24V8M33 13L38 8L43 13"),
  },
  "pull-over": {
    right: { points: [[122, 66], [152, 66], [178, 66]], hand: { at: [186, 66], kind: "point", angle: 90 } },
    extras: motion("M168 88H192M186 82L192 88L186 94"),
  },
  "hazard-left": {
    left: { points: [[78, 66], [62, 98], [52, 128]], hand: { at: [50, 134], kind: "point", angle: 180 } },
    extras: <Warn x={24} y={152} />,
  },
  "hazard-right": {
    right: { points: [[122, 66], [138, 98], [148, 128]], hand: { at: [150, 134], kind: "point", angle: 180 } },
    extras: <Warn x={176} y={152} />,
  },
  "hazard-road": {
    left: { points: [[78, 66], [66, 100], [64, 132]], hand: { at: [62, 138], kind: "point", angle: 180 } },
    extras: <>{<Warn x={160} y={34} />}{motion("M160 62V52M155 57L160 52L165 57")}</>,
  },
  "single-file": { left: { points: [[78, 66], [56, 44], [56, 20]], hand: { at: [56, 12], kind: "one" } } },
  staggered: { left: { points: [[78, 66], [56, 44], [56, 20]], hand: { at: [56, 12], kind: "two" } } },
  acknowledge: { left: { points: [[78, 66], [48, 62], [36, 40]], hand: { at: [34, 32], kind: "thumb" } } },
  fuel: {
    left: { points: [[78, 66], [72, 92], [88, 104]], hand: { at: [93, 104], kind: "point", angle: 90 } },
    extras: <circle cx={108} cy={103} r={13} stroke={HOT} strokeWidth={3} fill="none" strokeDasharray="4 4" />,
  },
  "water-rest": { left: { points: [[78, 66], [66, 44], [84, 32]], hand: { at: [90, 34], kind: "thumb", angle: 70 } } },
  emergency: {
    left: { points: [[78, 66], [58, 36], [64, 10]], hand: { at: [64, 4], kind: "open" } },
    right: { points: [[122, 66], [142, 36], [136, 10]], hand: { at: [136, 4], kind: "open" } },
    extras: <>{motion("M44 16Q36 32 46 46")}{motion("M156 16Q164 32 154 46")}</>,
  },
  medical: {
    extras: (
      <g>
        <circle cx={160} cy={40} r={20} fill={RED} />
        <path d="M160 29V51M149 40H171" stroke="#fff" strokeWidth={5} strokeLinecap="round" />
      </g>
    ),
  },
};

function RiderArm({ arm, active }: { arm: Arm; active: boolean }) {
  return (
    <g>
      <path d={path(arm.points)} fill="none" stroke={active ? RED : "#4a4a4a"} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
      <Hand at={arm.hand.at} kind={arm.hand.kind} angle={arm.hand.angle} active={active} />
    </g>
  );
}

export default function SignalIllustration({ pose, label }: { pose: PoseId; label: string }) {
  const spec = POSES[pose];
  const left = spec.left ?? IDLE_LEFT;
  const right = spec.right ?? IDLE_RIGHT;
  return (
    <svg viewBox="0 0 200 180" role="img" aria-label={label} className="signal-art">
      <rect width="200" height="180" rx="18" fill="#0d0d0d" />
      <path d="M100 180V170" stroke="#1d1d1d" strokeWidth="2" />
      {/* motorcycle from behind */}
      <rect x="92" y="116" width="16" height="58" rx="8" fill="#161616" stroke="#4a4a4a" strokeWidth="2" />
      <rect x="78" y="106" width="44" height="14" rx="7" fill="#161616" stroke="#4a4a4a" strokeWidth="2" />
      <path d="M52 92H148" stroke="#4a4a4a" strokeWidth="4" strokeLinecap="round" />
      {/* rider */}
      <path d="M78 64L122 64L116 114L84 114Z" fill="#1c1c1c" stroke="#7a7a7a" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="100" cy="36" r="16" fill="#1c1c1c" stroke="#e8e8e8" strokeWidth="2.5" />
      <path d="M88 38H112" stroke={RED} strokeWidth="3" strokeLinecap="round" />
      {/* idle arm(s) first, then the signalling arm(s) on top */}
      {!spec.left && <RiderArm arm={IDLE_LEFT} active={false} />}
      {!spec.right && <RiderArm arm={IDLE_RIGHT} active={false} />}
      {spec.left && <RiderArm arm={left} active />}
      {spec.right && <RiderArm arm={right} active />}
      {spec.extras}
    </svg>
  );
}
