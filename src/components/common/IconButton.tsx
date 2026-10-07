import { ButtonHTMLAttributes, ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  active?: boolean;
  label: string; // accessible name, required
}

export default function IconButton({ children, active, label, className = "", ...rest }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`icon-btn ${active ? "icon-btn--active" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
