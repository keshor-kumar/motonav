import { Navigation2 } from "lucide-react";

export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="logo">
      <span className="logo__mark">
        <Navigation2 size={compact ? 18 : 22} strokeWidth={2.4} />
      </span>
      <span className="logo__word">
        Moto<span className="logo__word--accent">Nav</span>
      </span>
    </div>
  );
}
