import React from "react";
import type { UrgencyLevel } from "../lib/types";

export type SeverityVariant =
  | UrgencyLevel
  | "CRITICAL"
  | "HIGH"
  | "MODERATE"
  | "MEDIUM"
  | "LOW"
  | "UNKNOWN"
  | "INDETERMINATE";

interface SeverityBadgeProps {
  level: SeverityVariant | string;
  className?: string;
  size?: "sm" | "md";
}

export function SeverityBadge({
  level,
  className = "",
  size = "md",
}: SeverityBadgeProps) {
  const normalized = (level || "UNKNOWN").toUpperCase();

  let styles = {
    bg: "bg-[#F3F2F0]",
    border: "border-[#DDD9D2]",
    text: "text-[#8A857A]",
    dot: "bg-[#8A857A]",
    label: "Indeterminate",
  };

  if (normalized === "CRITICAL" || normalized === "HIGH") {
    styles = {
      bg: "bg-[#FAF0EE]",
      border: "border-[#E8C4BE]",
      text: "text-[#B5483A]",
      dot: "bg-[#B5483A]",
      label: normalized === "CRITICAL" ? "Critical Priority" : "High Severity",
    };
  } else if (normalized === "MODERATE" || normalized === "MEDIUM") {
    styles = {
      bg: "bg-[#FBF5EB]",
      border: "border-[#ECD6AD]",
      text: "text-[#B7791F]",
      dot: "bg-[#B7791F]",
      label: "Moderate Priority",
    };
  } else if (normalized === "LOW") {
    styles = {
      bg: "bg-[#F4F6EE]",
      border: "border-[#D4DCBF]",
      text: "text-[#5B6B3A]",
      dot: "bg-[#5B6B3A]",
      label: "Low Priority",
    };
  }

  const sizeClasses =
    size === "sm"
      ? "text-[11px] px-2 py-0.5 gap-1.5"
      : "text-xs px-2.5 py-1 gap-2";

  return (
    <span
      className={`inline-flex items-center font-medium uppercase tracking-wider rounded border ${styles.bg} ${styles.border} ${styles.text} ${sizeClasses} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`}
        aria-hidden="true"
      />
      <span>{styles.label}</span>
    </span>
  );
}
