import React from "react";
import { Spinner } from "./Spinner";

export type StatusType = "idle" | "loading" | "error" | "success";

interface StatusLineProps {
  status: StatusType;
  message: string;
  code?: string;
  className?: string;
}

export function StatusLine({
  status,
  message,
  code,
  className = "",
}: StatusLineProps) {
  if (status === "idle" && !message) {
    return null;
  }

  const statusConfig = {
    idle: {
      border: "border-[#E5E1D8]",
      bg: "bg-[#FFFFFF]",
      text: "text-[#6B665C]",
      dot: "bg-[#8A857A]",
    },
    loading: {
      border: "border-[#E5E1D8]",
      bg: "bg-[#FFFFFF]",
      text: "text-[#1F1D1A]",
      dot: "bg-[#1F1D1A]",
    },
    error: {
      border: "border-[#E8C4BE]",
      bg: "bg-[#FAF0EE]",
      text: "text-[#B5483A]",
      dot: "bg-[#B5483A]",
    },
    success: {
      border: "border-[#D4DCBF]",
      bg: "bg-[#F4F6EE]",
      text: "text-[#5B6B3A]",
      dot: "bg-[#5B6B3A]",
    },
  };

  const current = statusConfig[status];

  return (
    <div
      role={status === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`text-xs px-3 py-2 rounded-md border flex items-center justify-between gap-3 ${current.bg} ${current.border} ${current.text} ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {status === "loading" ? (
          <Spinner size="sm" className="text-[#1F1D1A]" />
        ) : (
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${current.dot}`}
            aria-hidden="true"
          />
        )}
        <span className="truncate font-medium">{message}</span>
      </div>

      {code ? (
        <span className="font-mono text-[11px] opacity-75 shrink-0 uppercase tracking-wider">
          {code}
        </span>
      ) : null}
    </div>
  );
}
