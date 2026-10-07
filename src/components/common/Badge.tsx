import { ReactNode } from "react";

type Tone = "ember" | "teal" | "amber" | "violet" | "muted" | "red";

export default function Badge({ tone = "muted", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
