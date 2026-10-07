import { Users } from "lucide-react";
import type { Rider } from "@/types";
import RiderCard from "@/components/riders/RiderCard";
import Card from "@/components/common/Card";

export default function RidersPanel({ riders }: { riders: Rider[] }) {
  const connectedCount = riders.filter((r) => r.status === "connected").length;

  return (
    <Card className="riders-panel">
      <div className="panel-header">
        <div className="panel-header__title">
          <Users size={18} />
          <h3>Group riders</h3>
        </div>
        <span className="panel-header__count">
          {connectedCount}/{riders.length} online
        </span>
      </div>
      <div className="riders-panel__list">
        {riders.map((rider) => (
          <RiderCard key={rider.id} rider={rider} />
        ))}
      </div>
    </Card>
  );
}
