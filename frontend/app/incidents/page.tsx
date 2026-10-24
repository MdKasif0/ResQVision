"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AppShell,
  Button,
  EmptyState,
  Panel,
  SeverityBadge,
  Spinner,
} from "@/components";
import { api, ApiClientError } from "@/lib/api";
import type { IncidentListItem } from "@/lib/types";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchIncidents = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.listIncidents();
      // Ensure sorted newest first
      const sorted = [...data].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setIncidents(sorted);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to load incidents registry from backend.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await api.deleteIncident(id);
      setIncidents((prev) => prev.filter((item) => item.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete incident.";
      setErrorMessage(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch {
      return iso;
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="border-b border-[#E5E1D8] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1F1D1A]">
              Incident Registry
            </h1>
            <p className="text-xs text-[#6B665C] mt-1">
              Historical catalog of vision detections, extracted features, and evidentiary assessments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={fetchIncidents}
            >
              Refresh
            </Button>
            <Link href="/">
              <Button variant="primary" size="sm">
                Start New Analysis
              </Button>
            </Link>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="p-4 rounded-md bg-[#FAF0EE] border border-[#E8C4BE] text-[#B5483A] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-subtle"
          >
            <div className="space-y-1">
              <span className="font-semibold block">Error Loading Incidents</span>
              <p className="text-[#B5483A]/90">{errorMessage}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchIncidents}
              className="!border-[#B5483A]/40 !text-[#B5483A] hover:!bg-[#B5483A]/10 self-start sm:self-auto shrink-0"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Main Incidents Table Panel */}
        <Panel
          title="Persisted Incident Records"
          subtitle="Saved locally in data/incidents.json (capped at 50 newest)"
          action={
            <span className="text-[11px] font-mono text-[#6B665C] bg-[#FAF8F4] px-2.5 py-0.5 rounded border border-[#E5E1D8]">
              {incidents.length} {incidents.length === 1 ? "Record" : "Records"}
            </span>
          }
          bodyClassName="p-0"
        >
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-xs text-[#6B665C]">
              <Spinner size="md" />
              <span>Loading incident history...</span>
            </div>
          ) : incidents.length === 0 ? (
            <div className="py-12 px-4">
              <EmptyState
                title="No incident records found"
                description="No field imagery has been processed yet. Upload and analyze an image to automatically store a structured triage record."
                action={
                  <Link href="/">
                    <Button variant="secondary" size="sm">
                      Go to Analyze Workflow
                    </Button>
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E1D8] bg-[#FAF8F4] text-[#6B665C] font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Origin</th>
                    <th className="py-2.5 px-4">Urgency</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Persons</th>
                    <th className="py-2.5 px-4">Location Label</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E1D8]">
                  {incidents.map((item) => {
                    const isConfirming = confirmDeleteId === item.id;
                    const urgency = item.severity || item.urgency_level || "UNKNOWN";
                    const isLive = item.origin === "live_analysis";

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-[#FAF8F4]/80 transition-colors"
                      >
                        {/* Timestamp */}
                        <td className="py-3 px-4 font-mono text-[11px] text-[#1F1D1A] whitespace-nowrap">
                          {formatTimestamp(item.created_at)}
                        </td>

                        {/* Origin Badge */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono ${
                              isLive
                                ? "bg-[#FAF8F4] border border-[#E5E1D8] text-[#1F1D1A]"
                                : "bg-[#F3F2F0] border border-[#8A857A]/40 text-[#6B665C]"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isLive ? "bg-[#5B6B3A]" : "bg-[#8A857A]"
                              }`}
                            />
                            {isLive ? "Live analysis" : "Sample"}
                          </span>
                        </td>

                        {/* Severity Badge (Only color accent) */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <SeverityBadge level={urgency} />
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4 font-mono text-[11px] text-[#1F1D1A] whitespace-nowrap">
                          {item.category || "—"}
                        </td>

                        {/* Person Count */}
                        <td className="py-3 px-4 font-mono text-[11px] text-[#1F1D1A] whitespace-nowrap">
                          {item.person_count}{" "}
                          <span className="text-[#6B665C]">
                            {item.person_count === 1 ? "person" : "persons"}
                          </span>
                        </td>

                        {/* Location Label (Untrusted text rendered safely) */}
                        <td className="py-3 px-4 text-[#1F1D1A] max-w-[200px] truncate">
                          {item.location_label ? (
                            <span>{item.location_label}</span>
                          ) : (
                            <span className="text-[#8A857A] italic">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {isConfirming ? (
                            <div className="inline-flex items-center gap-1.5">
                              <span className="text-[11px] text-[#B5483A] font-medium mr-1">
                                Confirm?
                              </span>
                              <Button
                                size="sm"
                                variant="danger"
                                disabled={isDeleting}
                                onClick={() => handleDelete(item.id)}
                                className="!py-1 !px-2 text-[10px]"
                              >
                                {isDeleting ? "Deleting..." : "Yes, Delete"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isDeleting}
                                onClick={() => setConfirmDeleteId(null)}
                                className="!py-1 !px-2 text-[10px]"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              <Link href={`/incidents/${encodeURIComponent(item.id)}`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="!py-1 !px-2.5 text-[11px]"
                                >
                                  Inspect &rarr;
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmDeleteId(item.id)}
                                className="!py-1 !px-2 text-[11px] !text-[#8A857A] hover:!text-[#B5483A]"
                              >
                                Delete
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
