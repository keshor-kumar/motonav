import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, Phone, Share2, Cross, X } from "lucide-react";
import { getCurrentLocation } from "@/services/locationService";

const HOLD_MS = 1500;

function SosDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function shareLocation() {
    setMessage("Getting your location…");
    try {
      const { lat, lng } = await getCurrentLocation();
      const url = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
      const text = `I need help. My location: ${url}`;
      if (typeof navigator.share === "function") {
        await navigator.share({ title: "I need help", text, url });
        setMessage(null);
      } else {
        await navigator.clipboard.writeText(text);
        setMessage("Location link copied — paste it into a message.");
      }
    } catch (err) {
      const e = err as { message?: string; name?: string };
      setMessage(e.name === "AbortError" ? null : e.message ?? "Unable to get your current location.");
    }
  }

  return (
    <div className="sos-overlay" role="alertdialog" aria-modal="true" aria-label="Emergency options">
      <div className="sos-dialog">
        <button type="button" className="icon-btn sos-dialog__close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <ShieldAlert size={36} className="sos-dialog__icon" />
        <h2>Need help?</h2>
        <p className="sos-dialog__note">
          MotoNav does not contact emergency services or your crew automatically yet. Use these options directly.
        </p>
        <a className="btn btn--danger btn--lg btn--full" href="tel:112">
          <Phone size={18} /> Call 112 (emergency)
        </a>
        <button type="button" className="btn btn--secondary btn--lg btn--full" onClick={() => void shareLocation()}>
          <Share2 size={18} /> Share my location
        </button>
        <button
          type="button"
          className="btn btn--secondary btn--lg btn--full"
          onClick={() => {
            onClose();
            navigate("/dashboard?tab=nearby&cat=hospital");
          }}
        >
          <Cross size={18} /> Nearby hospitals
        </button>
        {message && <p className="sos-dialog__msg">{message}</p>}
      </div>
    </div>
  );
}

/** Hold-to-activate SOS — deliberately NOT a one-tap button, so it can't fire by accident. */
export default function SosButton() {
  const [holding, setHolding] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  function start() {
    if (open) return;
    setHolding(true);
    timer.current = window.setTimeout(() => {
      setHolding(false);
      setOpen(true);
    }, HOLD_MS);
  }
  function cancel() {
    setHolding(false);
    window.clearTimeout(timer.current);
  }
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <>
      <button
        type="button"
        className={`sos-btn ${holding ? "sos-btn--holding" : ""}`}
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
            e.preventDefault();
            start();
          }
        }}
        onKeyUp={cancel}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="SOS. Press and hold for 1.5 seconds to open emergency options."
      >
        <span className="sos-btn__ring" />
        <ShieldAlert size={26} />
        <span className="sos-btn__label">SOS</span>
        <span className="sos-btn__hint">Press & hold</span>
      </button>
      {open && <SosDialog onClose={() => setOpen(false)} />}
    </>
  );
}
