import { useEffect } from "react";

/**
 * Publishes the *visible* viewport (what's left above the on-screen keyboard) as CSS variables on <html>:
 *   --vv-h / --vv-top, plus data-kb="open" while a keyboard is up.
 * Full-screen layouts (dashboard shell, chat) use them so inputs and bottom bars are never hidden behind
 * the keyboard. Does nothing when visualViewport isn't supported or no keyboard is open.
 */
export default function KeyboardViewportSync() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    let raf = 0;
    const apply = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const open = window.innerHeight - vv.height > 120;
        if (open) {
          root.dataset.kb = "open";
          root.style.setProperty("--vv-h", `${Math.round(vv.height)}px`);
          root.style.setProperty("--vv-top", `${Math.round(vv.offsetTop)}px`);
        } else {
          delete root.dataset.kb;
          root.style.removeProperty("--vv-h");
          root.style.removeProperty("--vv-top");
        }
      });
    };
    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
      delete root.dataset.kb;
      root.style.removeProperty("--vv-h");
      root.style.removeProperty("--vv-top");
    };
  }, []);
  return null;
}
