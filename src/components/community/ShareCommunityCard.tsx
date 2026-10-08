import { useState } from "react";
import { Check, Copy, QrCode, Share2 } from "lucide-react";
import { buildCommunityUrl } from "@/config/env";

interface ShareCommunityCardProps {
  code: string;
  name: string;
}

/**
 * Public invite for a community: the code, a /community/<code> link (Copy Link / Share / QR).
 * The QR image comes from a keyless public QR endpoint rendered as a plain <img>, so no QR library is
 * bundled; if it can't load, the link itself still works via Copy / Share.
 */
export default function ShareCommunityCard({ code, name }: ShareCommunityCardProps) {
  const url = buildCommunityUrl(code);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — the link is visible to copy by hand */
    }
  }
  async function share() {
    try {
      await navigator.share({ title: `Join ${name} on MotoNav`, text: `Join the ${name} riders on MotoNav`, url });
    } catch {
      /* share sheet dismissed */
    }
  }

  return (
    <div className="share-card">
      <p className="share-card__code-label">Community code</p>
      <p className="share-card__code mono">{code}</p>
      <div className="invite-link">
        <span className="mono invite-link__text">{url}</span>
        <button type="button" className="icon-btn" onClick={() => void copy()} aria-label="Copy community link">
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      <div className="share-card__actions">
        {canShare && (
          <button type="button" className="btn btn--secondary btn--md" onClick={() => void share()}>
            <Share2 size={16} aria-hidden="true" /> Share
          </button>
        )}
        <button type="button" className="btn btn--secondary btn--md" onClick={() => void copy()}>
          {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />} {copied ? "Copied" : "Copy Link"}
        </button>
        <button type="button" className="btn btn--secondary btn--md" onClick={() => setShowQr((v) => !v)} aria-expanded={showQr}>
          <QrCode size={16} aria-hidden="true" /> {showQr ? "Hide QR" : "QR code"}
        </button>
      </div>
      {showQr && (
        <div className="share-card__qr">
          {qrFailed ? (
            <p className="note">Couldn't load the QR code. Share the link above instead.</p>
          ) : (
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(url)}`}
              alt={`QR code for ${name}`}
              width={220}
              height={220}
              onError={() => setQrFailed(true)}
            />
          )}
        </div>
      )}
    </div>
  );
}
