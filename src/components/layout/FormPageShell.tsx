import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import Logo from "@/components/common/Logo";

interface FormPageShellProps {
  title: string;
  lede: string;
  image: string;
  children: ReactNode;
}

/** Cinematic frame for Create/Join: photo on top (phones) or left (desktop), form beside it. */
export default function FormPageShell({ title, lede, image, children }: FormPageShellProps) {
  return (
    <div className="fp">
      <div className="fp__media">
        <img src={image} alt="" decoding="async" />
        <div className="fp__scrim" />
        <Link to="/" className="fp__brand" aria-label="MotoNav home">
          <Logo />
        </Link>
      </div>
      <main className="fp__panel">
        <Link to="/" className="fp__back">
          <ChevronLeft size={16} /> Back
        </Link>
        <h1 className="fp__title">{title}</h1>
        <p className="fp__lede">{lede}</p>
        {children}
      </main>
    </div>
  );
}
