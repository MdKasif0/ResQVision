"use client";

import React, { useEffect, useState } from "react";
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

export default function MapPage() {
  const [incidents, setIncidents] = useState<IncidentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [flyToLocation, setFlyToLocation] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
  } | null>(null);

  const fetchIncidents = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.listIncidents();
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
        setErrorMessage("Failed to load incidents registry.");
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
        setIncidents(data);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to load incidents registry.";
        setErrorMessage(msg);
        setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

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

  const handleSelectIncident = (id: string) => {
    setSelectedIncidentId(id);
    const inc = incidents.find((i) => i.id === id);
    if (
      inc?.location &&
      typeof inc.location.latitude === "number" &&
      typeof inc.location.longitude === "number"
    ) {
      setFlyToLocation({
        lat: inc.location.latitude,
        lng: inc.location.longitude,
        zoom: 14,
      });
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
              Live Incident Map
            </h1>
            <p className="text-xs text-[#6B665C] mt-1">
              Geospatial view of user-entered incident coordinates &bull;
              Notice: 2D detection does not establish real-world GPS position.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={fetchIncidents}
            >
              Refresh Map
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

        {/* Map & Incident Feed Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Map View (8 Cols) */}
          <div className="lg:col-span-8">
            <Panel
              title="Geospatial Map"
              subtitle="Default viewport centered near Chandigarh University, Mohali (viewport only, not incident data)"
              action={
                <span className="text-[11px] font-mono text-[#6B665C] bg-[#FAF8F4] px-2.5 py-0.5 rounded border border-[#E5E1D8]">
                  {mappedIncidents.length} Mapped on Canvas
                </span>
              }
              bodyClassName="p-0"
            >
              <MapView
                incidents={mappedIncidents}
                selectedIncidentId={selectedIncidentId}
                onSelectIncident={handleSelectIncident}
                flyToLocation={flyToLocation}
                height="560px"
              />
            </Panel>
          </div>

          {/* Incident Feed Sidebar (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <Panel
              title="Catalog Records"
              subtitle="Click to locate on map canvas"
              action={
                <span className="text-[11px] font-mono text-[#6B665C] bg-[#FAF8F4] px-2.5 py-0.5 rounded border border-[#E5E1D8]">
                  {incidents.length} Total
                </span>
              }
              bodyClassName="p-0"
            >
              {isLoading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-xs text-[#6B665C]">
                  <Spinner size="md" />
                  <span>Loading records...</span>
                </div>
              ) : incidents.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="No incidents recorded"
                    description="Upload an image to start analyzing."
                    action={
                      <Link href="/analyze">
                        <Button variant="secondary" size="sm">
                          Analyze Image
                        </Button>
                      </Link>
                    }
                  />
                </div>
              ) : (
                <div className="divide-y divide-[#E5E1D8] max-h-[560px] overflow-y-auto">
                  {incidents.map((item) => {
                    const isSelected = selectedIncidentId === item.id;
                    const urgency = item.severity || item.urgency_level || "UNKNOWN";
                    const hasLocation =
                      item.location &&
                      typeof item.location.latitude === "number" &&
                      typeof item.location.longitude === "number";

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectIncident(item.id)}
                        className={`p-3 text-xs transition-colors cursor-pointer space-y-1.5 ${
                          isSelected
                            ? "bg-[#FAF0EE] border-l-4 border-l-[#1F1D1A]"
                            : "hover:bg-[#FAF8F4]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <SeverityBadge level={urgency} size="sm" />
                          <span className="font-mono text-[10px] text-[#6B665C]">
                            {formatTimestamp(item.created_at)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-[#1F1D1A] truncate">
                            {item.location_label || item.location?.address || "Unlabeled Site"}
                          </span>
                          <span className="font-mono text-[11px] text-[#6B665C] shrink-0">
                            {item.person_count} {item.person_count === 1 ? "person" : "persons"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          {hasLocation ? (
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <span className="font-mono text-[#6B665C]">
                                {item.location!.latitude!.toFixed(4)}, {item.location!.longitude!.toFixed(4)}
                              </span>
                              <span className="text-[9px] uppercase font-semibold text-[#5B6B3A] bg-[#F4F6EE] px-1 py-0.2 rounded border border-[#D4DCBF]">
                                User-entered
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#8A857A] bg-[#F3F2F0] px-1.5 py-0.5 rounded border border-[#DDD9D2]">
                              No location
                            </span>
                          )}

                          <Link
                            href={`/incidents/${encodeURIComponent(item.id)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] text-[#1F1D1A] hover:underline font-medium"
                          >
                            Inspect &rarr;
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
