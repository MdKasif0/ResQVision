"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AppShell,
  Button,
  EmptyState,
  MapView,
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
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [flyToLocation, setFlyToLocation] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const handleRowClick = (item: IncidentListItem) => {
    setSelectedIncidentId(item.id);
    if (
      item.location &&
      typeof item.location.latitude === "number" &&
      typeof item.location.longitude === "number" &&
      !isNaN(item.location.latitude) &&
      !isNaN(item.location.longitude)
    ) {
      setFlyToLocation({
        lat: item.location.latitude,
        lng: item.location.longitude,
        zoom: 14,
      });
    }
  };

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
    let isMounted = true;
    api
      .listIncidents()
      .then((data) => {
        if (!isMounted) return;
        const sorted = [...data].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setIncidents(sorted);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to load incidents registry from backend.";
        setErrorMessage(msg);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
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

  const handleLoadSampleIncident = async () => {
    setIsLoadingSample(true);
    setErrorMessage(null);
    try {
      const sample = await api.loadSample("sample_people_crowd");
      setIncidents((prev) => [
        {
          id: sample.id,
          created_at: sample.created_at,
          origin: sample.origin || "sample",
          severity: sample.assessment.urgency_level,
          urgency_level: sample.assessment.urgency_level,
          category: sample.assessment.category,
          person_count: sample.detection_result.person_count,
          location_label: sample.location?.address,
          summary: sample.assessment.summary,
        },
        ...prev,
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load sample incident.";
      setErrorMessage(msg);
    } finally {
      setIsLoadingSample(false);
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

  const mappedIncidents = incidents
    .filter(
      (item) =>
        item.location &&
        typeof item.location.latitude === "number" &&
        typeof item.location.longitude === "number" &&
        !isNaN(item.location.latitude) &&
        !isNaN(item.location.longitude) &&
        item.location.latitude >= -90 &&
        item.location.latitude <= 90 &&
        item.location.longitude >= -180 &&
        item.location.longitude <= 180
    )
    .map((item) => ({
      id: item.id,
      created_at: item.created_at,
      severity: item.severity || item.urgency_level || "UNKNOWN",
      person_count: item.person_count,
      location_label: item.location_label || item.location?.address,
      latitude: item.location!.latitude!,
      longitude: item.location!.longitude!,
      summary: item.summary,
    }));

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
            <Link href="/analyze">
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

        {/* Geospatial Registry Map Panel */}
        <Panel
          title="Incident Geospatial Registry"
          subtitle="Showing recorded incidents with user-entered coordinates (detection does not establish real-world position)"
          action={
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[#6B665C] bg-[#FAF8F4] px-2.5 py-0.5 rounded border border-[#E5E1D8]">
                {mappedIncidents.length} Mapped &bull; {incidents.length - mappedIncidents.length} No Location
              </span>
            </div>
          }
        >
          <MapView
            incidents={mappedIncidents}
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={(id) => {
              setSelectedIncidentId(id);
              const targetRow = rowRefs.current[id];
              if (targetRow) {
                targetRow.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }
            }}
            flyToLocation={flyToLocation}
            height="320px"
          />
        </Panel>

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
                description="No field imagery has been processed yet. Upload and analyze an image or run genuine inference on benchmark evaluation imagery."
                action={
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isLoadingSample}
                      onClick={handleLoadSampleIncident}
                    >
                      {isLoadingSample ? (
                        <span className="flex items-center gap-1.5">
                          <Spinner size="sm" />
                          <span>Running Pipeline...</span>
                        </span>
                      ) : (
                        "Load Benchmark Sample"
                      )}
                    </Button>
                    <Link href="/">
                      <Button variant="outline" size="sm">
                        Analyze Field Image
                      </Button>
                    </Link>
                  </div>
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
                    const isSelected = selectedIncidentId === item.id;
                    const hasLocation =
                      item.location &&
                      typeof item.location.latitude === "number" &&
                      typeof item.location.longitude === "number" &&
                      !isNaN(item.location.latitude) &&
                      !isNaN(item.location.longitude);

                    return (
                      <tr
                        key={item.id}
                        ref={(el) => {
                          rowRefs.current[item.id] = el;
                        }}
                        onClick={() => handleRowClick(item)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#FAF0EE] border-l-4 border-l-[#1F1D1A]"
                            : "hover:bg-[#FAF8F4]/80"
                        }`}
                      >
                        {/* Timestamp */}
                        <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap">
                          <Link
                            href={`/incidents/${encodeURIComponent(item.id)}`}
                            className="text-[#1F1D1A] hover:underline"
                          >
                            {formatTimestamp(item.created_at)}
                          </Link>
                        </td>

                        {/* Origin Badge */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isLive ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono bg-[#FAF8F4] border border-[#E5E1D8] text-[#1F1D1A]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#5B6B3A]" />
                              <span>Live Analysis</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FAF0EE] border border-[#B5483A] text-[#B5483A]">
                              SAMPLE
                            </span>
                          )}
                        </td>

                        {/* Severity Badge */}
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

                        {/* Location Label (Untrusted text rendered safely with tooltip) */}
                        <td
                          className="py-3 px-4 text-[#1F1D1A] max-w-[220px]"
                          title={item.location_label || undefined}
                        >
                          {hasLocation ? (
                            <div className="space-y-0.5">
                              <span className="font-medium truncate block">
                                {item.location_label || item.location?.address || "Pinned Site"}
                              </span>
                              <div className="flex items-center gap-1.5 text-[10px] text-[#6B665C]">
                                <span className="font-mono">
                                  {item.location!.latitude!.toFixed(4)}, {item.location!.longitude!.toFixed(4)}
                                </span>
                                <span className="text-[9px] uppercase font-semibold text-[#5B6B3A] bg-[#F4F6EE] px-1 py-0.2 rounded border border-[#D4DCBF]">
                                  User-entered
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              {item.location_label && (
                                <span className="truncate block">{item.location_label}</span>
                              )}
                              <span className="inline-flex items-center gap-1 text-[10px] text-[#8A857A] bg-[#F3F2F0] px-1.5 py-0.5 rounded border border-[#DDD9D2]">
                                No location
                              </span>
                            </div>
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
