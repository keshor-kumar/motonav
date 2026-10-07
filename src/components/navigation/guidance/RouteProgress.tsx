export default function RouteProgress({ progress }: { progress: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <div className="gd-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Route progress">
      <div className="gd-progress__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
