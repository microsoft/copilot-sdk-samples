import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | "status-implemented"
    | "status-planned"
    | "tier"
    | "connector"
    | "sdk"
    | "ghaw";
}

const Badge: React.FC<BadgeProps> = ({ children, variant = "tier" }) => {
  return <span className={`badge badge-${variant}`}>{children}</span>;
};

export default Badge;
