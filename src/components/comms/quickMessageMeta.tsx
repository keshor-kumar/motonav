import { Octagon, Fuel, Coffee, AlertTriangle, ChevronsDown, Users, MapPin, ShieldAlert } from "lucide-react";
import type { QuickMessageKind } from "@/types/comms";

export type MessagePriority = "normal" | "high" | "critical";

export const QUICK_MESSAGE_META: Record<
  QuickMessageKind,
  { label: string; short: string; icon: typeof Fuel; priority: MessagePriority; bannerMs: number }
> = {
  stopping: { label: "I'm stopping", short: "Stopping", icon: Octagon, priority: "normal", bannerMs: 6000 },
  fuel: { label: "Fuel stop", short: "Fuel stop", icon: Fuel, priority: "normal", bannerMs: 6000 },
  break: { label: "Break", short: "Break", icon: Coffee, priority: "normal", bannerMs: 6000 },
  hazard: { label: "Hazard ahead", short: "Hazard ahead", icon: AlertTriangle, priority: "high", bannerMs: 10000 },
  slow: { label: "Slow down", short: "Slow down", icon: ChevronsDown, priority: "normal", bannerMs: 6000 },
  wait: { label: "Wait for me", short: "Wait for me", icon: Users, priority: "normal", bannerMs: 7000 },
  meet: { label: "Meet here", short: "Meet here", icon: MapPin, priority: "normal", bannerMs: 8000 },
  emergency: { label: "Emergency", short: "Emergency", icon: ShieldAlert, priority: "critical", bannerMs: 20000 },
};

export const QUICK_MESSAGE_ORDER: QuickMessageKind[] = ["stopping", "fuel", "break", "hazard", "slow", "wait", "meet", "emergency"];

const RANK: Record<MessagePriority, number> = { critical: 0, high: 1, normal: 2 };
export const priorityRank = (kind: QuickMessageKind): number => RANK[QUICK_MESSAGE_META[kind].priority];
