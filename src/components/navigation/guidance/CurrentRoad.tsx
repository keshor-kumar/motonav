export default function CurrentRoad({ name }: { name: string | null }) {
  return (
    <div className="gd-road">
      <span className="gd-road__label">Current road</span>
      <span className="gd-road__name">{name ?? "—"}</span>
    </div>
  );
}
