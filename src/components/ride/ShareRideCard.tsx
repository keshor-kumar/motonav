import { useState } from "react";
import { Copy, Check, Share2, QrCode } from "lucide-react";
import { buildJoinUrl } from "@/config/env";

interface ShareRideCardProps {
  rideCode: string;
  rideName: string;
}

/**
 * Copy Link / Share (Web Share API, with a copy-to-clipboard fallback) / QR
 * code for a ride's public join URL. The QR image comes from a public,
 * keyless QR-generation endpoint (api.qrserver.com) — rendered as a plain
 * <img>, so no QR-encoding library/dependency is needed. If that request
 * fails (e.g. offline), the link itself still works via Copy/Share.
 */
export default function ShareRideCard({ rideCode, rideName }: ShareRideCardProps) {
  const joinUrl = buildJoinUrl(rideCode);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard API unavailable in this context — the link is still visible to copy manually.
    }
  }

  async function handleShare() {
    if (!canShare) return;
    try {
      await navigator.share({ title: `Join "${rideName}" on MotoNav`, text: `Join my ride: ${rideName}`, url: joinUrl });
    } catch {
      // Share sheet dismissed/cancelled by the user — not an error.
    }
  }

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(joinUrl)}`;

  return (
    <div className="share-ride">
      <div className="invite-link">
        <span className="mono invite-link__text">{joinUrl}</span>
        <button className="icon-btn" onClick={handleCopy} aria-label="Copy join link">
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>

      <div className="share-ride__actions">
        {canShare && (
          <button type="button" className="btn btn--secondary btn--md" onClick={handleShare}>
            <Share2 size={16} /> Share
          </button>
        )}
        <button type="button" className="btn btn--secondary btn--md" onClick={handleCopy}>
          <Copy size={16} /> {copied ? "Copied!" : "Copy link"}
        </button>
        <button type="button" className="btn btn--secondary btn--md" onClick={() => setShowQr((v) => !v)}>
          <QrCode size={16} /> {showQr ? "Hide QR" : "Show QR"}
        </button>
      </div>

      {showQr && (
        <div className="share-ride__qr">
          {!qrFailed ? (
            <img
              src={qrImageUrl}
              alt={`QR code to join ${rideName}`}
              width={180}
              height={180}
              onError={() => setQrFailed(true)}
            />
          ) : (
            <p className="share-ride__qr-fallback">
              QR code couldn't load — share the link above instead.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
