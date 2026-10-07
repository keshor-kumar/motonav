import type { ReactNode } from "react";
import { useReveal } from "@/hooks/useReveal";

/** Fade/slide-in on scroll (transform + opacity only, so it stays cheap). */
export default function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
