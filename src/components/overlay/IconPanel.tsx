import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

interface IconPanelProps {
  title: string;
  icon: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

/** A compact bottom-sheet opened by tapping a map icon. Tap the backdrop or
 *  the X to close and return to the clean map — info never stays permanently on screen. */
export default function IconPanel({ title, icon, onClose, children }: IconPanelProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="icon-panel-backdrop" onClick={onClose} />
      <div className="icon-panel" role="dialog" aria-label={title}>
        <div className="icon-panel__header">
          <span className="icon-panel__title">
            {icon} {title}
          </span>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
