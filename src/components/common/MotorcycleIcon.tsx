interface MotorcycleIconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/** Side-view motorcycle line icon (matches Lucide's 24px/rounded-stroke style). */
export default function MotorcycleIcon({ size = 20, strokeWidth = 1.8, className }: MotorcycleIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="5" cy="17" r="3.2" />
      <circle cx="19" cy="17" r="3.2" />
      <path d="M19 17 16.3 8.3" />
      <path d="M14.8 7.6h2.8" />
      <path d="M16.3 8.3 13.4 11.4H8.4L5 17" />
      <path d="M6.2 10.2h4.4" />
      <path d="M9.2 14.3h4.6" />
    </svg>
  );
}
