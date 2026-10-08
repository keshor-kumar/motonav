import type { ReactNode } from "react";
import SiteHeader from "@/components/layout/SiteHeader";

interface PageShellProps {
  title?: string;
  lede?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** Normal, naturally scrolling page: header row, content, footer — all in the document flow. */
export default function PageShell({ title, lede, actions, children }: PageShellProps) {
  return (
    <div className="pg">
      <SiteHeader />
      <main className="pg__main">
        {(title || actions) && (
          <div className="pg__head">
            <div className="pg__titles">
              {title && <h1 className="pg__title">{title}</h1>}
              {lede && <p className="pg__lede">{lede}</p>}
            </div>
            {actions && <div className="pg__actions">{actions}</div>}
          </div>
        )}
        {children}
      </main>
      <footer className="pg__footer">MotoNav · Ride together, ride safe.</footer>
    </div>
  );
}
