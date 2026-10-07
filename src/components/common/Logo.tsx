interface LogoProps {
  compact?: boolean;
  className?: string;
}

/** MotoNav mark: a winding road resolving into a forward arrowhead — not a map pin. */
export default function Logo({ compact = false, className = "" }: LogoProps) {
  return (
    <span className={`brand ${compact ? "brand--compact" : ""} ${className}`}>
      <svg className="brand__mark" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="currentColor" opacity="0.12" />
        <path d="M6 25c6.5-1 8-8.5 12-10.5s6.5-2 9-8.5" fill="none" stroke="var(--accent-ember)" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M21 6.5h6v6" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="brand__word">
        MOTO<span className="brand__word-accent">NAV</span>
      </span>
    </span>
  );
}
