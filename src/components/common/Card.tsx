import { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  elevated?: boolean;
}

export default function Card({ children, elevated, className = "", ...rest }: CardProps) {
  return (
    <div className={`card ${elevated ? "card--elevated" : ""} ${className}`} {...rest}>
      {children}
    </div>
  );
}
