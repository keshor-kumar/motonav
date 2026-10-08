import { useEffect, useState } from "react";

export interface ViewportBox {
  /** Height of the *visible* area in px (shrinks when the on-screen keyboard opens). null = unknown, use CSS dvh. */
  height: number | null;
  /** Offset of the visible area from the layout viewport's top (iOS scrolls the page when the keyboard opens). */
  top: number;
  keyboardOpen: boolean;
}

/**
 * Tracks window.visualViewport so a full-height chat can keep its composer above the mobile keyboard
 * on both iOS (keyboard overlays the layout viewport) and Android (Chrome resizes only the visual viewport).
 * Falls back to plain `100dvh` where visualViewport isn't available.
 */
export function useViewportBox(): ViewportBox {
  const [box, setBox] = useState<ViewportBox>({ height: null, top: 0, keyboardOpen: false });

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const keyboardOpen = window.innerHeight - vv.height > 120;
        setBox((prev) => {
          const next = { height: Math.round(vv.height), top: Math.round(vv.offsetTop), keyboardOpen };
          return prev.height === next.height && prev.top === next.top && prev.keyboardOpen === next.keyboardOpen ? prev : next;
        });
      });
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return box;
}
