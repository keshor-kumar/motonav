import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

interface AppSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Always-visible summary row (collapsed state). */
  peek: ReactNode;
  children: ReactNode;
}

/**
 * Bottom sheet on phones (tap or swipe the handle), floating left panel on
 * desktop (always open — CSS handles the switch). The map stays the focus.
 */
export default function AppSheet({ open, onOpenChange, peek, children }: AppSheetProps) {
  const startY = useRef<number | null>(null);
  const swiped = useRef(false);

  function onPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    startY.current = e.clientY;
  }
  function onPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    if (startY.current === null) return;
    const dy = e.clientY - startY.current;
    startY.current = null;
    if (Math.abs(dy) > 40) {
      swiped.current = true;
      onOpenChange(dy < 0);
    }
  }
  function onClick() {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    onOpenChange(!open);
  }

  return (
    <section className={`app-sheet ${open ? "app-sheet--open" : ""}`}>
      <button
        type="button"
        className="app-sheet__handle"
        aria-label={open ? "Collapse panel" : "Expand panel"}
        aria-expanded={open}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <span />
      </button>
      <div className="app-sheet__peek">{peek}</div>
      <div className="app-sheet__body">{children}</div>
    </section>
  );
}
