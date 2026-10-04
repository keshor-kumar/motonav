import type { ConnectionStatus } from "@/types";

export default function StatusDot({ status }: { status: ConnectionStatus }) {
  return <span className={`status-dot status-dot--${status}`} aria-hidden="true" />;
}
