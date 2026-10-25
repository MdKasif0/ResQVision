"use client";

import React, { useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import type { HealthResponse } from "@/lib/types";

interface BackendStatusProps {
  theme?: "light" | "dark";
  className?: string;
}

type ConnectionStatus = "checking" | "reachable" | "unreachable";

export function BackendStatus({
  theme = "light",
  className = "",
}: BackendStatusProps) {
  const [status, setStatus] = useState<ConnectionStatus>("checking");
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const checkHealth = async () => {
    try {
      const data = await api.health();
      setHealthData(data);
      setStatus("reachable");
      setErrorMessage(null);
    } catch (err) {
      setStatus("unreachable");
      setHealthData(null);
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Connection refused or backend unreachable");
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    const performCheck = async () => {
      try {
        const data = await api.health();
        if (!isMounted) return;
        setHealthData(data);
        setStatus("reachable");
        setErrorMessage(null);
      } catch (err) {
        if (!isMounted) return;
        setStatus("unreachable");
        setHealthData(null);
        if (err instanceof ApiClientError) {
          setErrorMessage(err.message);
        } else if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage("Connection refused or backend unreachable");
        }
      }
    };

    performCheck();
    const interval = setInterval(performCheck, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const isDark = theme === "dark";

  // Dot color classes (Olive for reachable, Terracotta for unreachable, Neutral for checking)
  const dotColorClass =
    status === "reachable"
      ? "bg-[#5B6B3A] shadow-[0_0_6px_rgba(91,107,58,0.5)]"
      : status === "unreachable"
      ? "bg-[#B5483A] shadow-[0_0_6px_rgba(181,72,58,0.5)]"
      : "bg-[#8A857A]";

  // Text color classes
  const textColorClass = isDark
    ? status === "reachable"
      ? "text-[#A8B78A]"
      : status === "unreachable"
      ? "text-[#E08A7E]"
      : "text-white/60"
    : status === "reachable"
    ? "text-[#5B6B3A]"
    : status === "unreachable"
    ? "text-[#B5483A]"
    : "text-[#8A857A]";

  const statusLabel =
    status === "reachable"
      ? "Backend: Reachable"
      : status === "unreachable"
      ? "Backend: Unreachable"
      : "Backend: Checking...";

  const tooltipDetails =
    status === "reachable"
      ? `FastAPI ${healthData?.version || "v0.1.0"} active. Groq: ${
          healthData?.groq_configured ? "Configured" : "Unconfigured"
        }`
      : `Cannot reach backend at http://localhost:8000. ${
          errorMessage ? `(${errorMessage})` : "Server offline."
        }`;

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        type="button"
        onClick={() => {
          setStatus("checking");
          checkHealth();
        }}
        title={tooltipDetails}
        aria-label={`Backend status: ${status}. Click to retry.`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium tracking-tight transition-all duration-150 focus:outline-none focus-visible:ring-1 ${
          isDark
            ? "bg-white/5 border border-white/10 hover:bg-white/10 focus-visible:ring-white/30"
            : "bg-[#FAF8F4] border border-[#E5E1D8] hover:bg-[#F2EFE9] focus-visible:ring-[#1F1D1A]"
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 transition-colors duration-200 ${dotColorClass}`}
          aria-hidden="true"
        />
        <span className={textColorClass}>{statusLabel}</span>
      </button>

      {/* Honest failure / status detail tooltip popover */}
      {showTooltip && (
        <div
          role="tooltip"
          className={`absolute top-full mt-1.5 right-0 z-50 w-64 p-2.5 text-xs rounded-md shadow-lg border transition-opacity pointer-events-none select-none ${
            isDark
              ? "bg-[#0E131F] text-white/90 border-white/15 shadow-black/60"
              : "bg-white text-[#1F1D1A] border-[#E5E1D8] shadow-black/10"
          }`}
        >
          <div className="flex items-center gap-1.5 font-semibold text-[11px] mb-1">
            <span
              className={`w-1.5 h-1.5 rounded-full ${dotColorClass}`}
              aria-hidden="true"
            />
            <span>
              {status === "reachable"
                ? "Backend Operational"
                : status === "unreachable"
                ? "Connection Failed"
                : "Checking Connection"}
            </span>
          </div>
          <p
            className={`text-[11px] leading-relaxed ${
              isDark ? "text-white/70" : "text-[#6B665C]"
            }`}
          >
            {tooltipDetails}
          </p>
          {status === "unreachable" && (
            <p className="mt-1.5 text-[10px] text-[#B5483A] font-medium">
              Start with: <code className="font-mono bg-black/10 px-1 py-0.5 rounded">uvicorn app.main:app</code>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
