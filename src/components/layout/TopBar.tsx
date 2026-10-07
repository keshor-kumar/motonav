import type { ReactNode } from "react";
import { ChevronLeft, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/common/Logo";

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  right?: ReactNode;
}

export default function TopBar({ title, showBack, right }: TopBarProps) {
  const navigate = useNavigate();
  return (
    <header className="topbar">
      <div className="topbar__left">
        {showBack ? (
          <button className="icon-btn" aria-label="Go back" onClick={() => navigate(-1)}>
            <ChevronLeft size={22} />
          </button>
        ) : (
          <Logo compact />
        )}
        {title && <h1 className="topbar__title">{title}</h1>}
      </div>
      <div className="topbar__right">
        {right}
        <button className="icon-btn" aria-label="Notifications">
          <Bell size={19} />
        </button>
      </div>
    </header>
  );
}
