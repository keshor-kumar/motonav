export default function SpeedDisplay({ speedKph }: { speedKph: number | null }) {
  return (
    <div className="gd-speed" aria-label="Current speed">
      <span className="gd-speed__value">{speedKph !== null ? speedKph : "—"}</span>
      <span className="gd-speed__unit">km/h</span>
    </div>
  );
}
