"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AppShell,
  Button,
  ImageOverlay,
  MapView,
  Panel,
  SeverityBadge,
  Spinner,
} from "@/components";
import { api, ApiClientError } from "@/lib/api";
import type { Incident } from "@/lib/types";

function IncidentDetailContent({ id }: { id: string }) {
  const router = useRouter();



  const [incident, setIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Overlay interaction state
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);
  const [hoveredDetectionId, setHoveredDetectionId] = useState<string | null>(null);

  const fetchIncident = async () => {
    if (!id) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.getIncident(id);
      setIncident(data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to load incident record.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    api
      .getIncident(id)
      .then((data) => {
        if (!isMounted) return;
        setIncident(data);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        const msg =
          err instanceof Error ? err.message : "Failed to load incident record.";
        setErrorMessage(msg);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await api.deleteIncident(id);
      router.push("/incidents");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete incident.";
      setErrorMessage(msg);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleEvidenceChipClick = (ref: string) => {
    if (!incident) return;
    const isDetId = incident.detection_result.detections.some((d) => d.id === ref);
    if (isDetId) {
      setSelectedDetectionId(selectedDetectionId === ref ? null : ref);
    } else if (ref === "horizontal_candidates") {
      const firstCandidate = incident.scene_features.horizontal_candidates[0];
      setSelectedDetectionId(
        selectedDetectionId === firstCandidate ? null : firstCandidate || null
      );
    }
  };

  const formatTimestamp = (iso?: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Navigation Breadcrumb & Incident Actions */}
      <div className="border-b border-[#E5E1D8] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/incidents">
              <Button variant="outline" size="sm">
                &larr; Back to Registry
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1F1D1A] flex items-center gap-2">
                <span>Incident Record</span>
                {incident && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#FAF8F4] border border-[#E5E1D8] text-[#6B665C] font-normal">
                    {incident.id.slice(0, 8)}...
                  </span>
                )}
              </h1>
              {incident && (
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {incident.origin === "sample" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FAF0EE] border border-[#B5483A] text-[#B5483A]">
                      BENCHMARK SAMPLE
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#FAF8F4] border border-[#5B6B3A]/40 text-[#5B6B3A]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5B6B3A]" />
                      LIVE ANALYSIS
                    </span>
                  )}
                  <span className="text-xs text-[#6B665C]">
                    Recorded: {formatTimestamp(incident.created_at)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {incident && (
            <div className="flex items-center gap-2">
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2 p-1 bg-[#FAF0EE] border border-[#E8C4BE] rounded">
                  <span className="text-xs text-[#B5483A] font-medium px-1">
                    Delete record and image?
                  </span>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={isDeleting}
                    onClick={handleDelete}
                  >
                    {isDeleting ? "Deleting..." : "Yes, Delete"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isDeleting}
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="!text-[#B5483A] !border-[#B5483A]/30 hover:!bg-[#FAF0EE]"
                >
                  Delete Incident
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="p-4 rounded-md bg-[#FAF0EE] border border-[#E8C4BE] text-[#B5483A] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-subtle"
          >
            <div className="space-y-1">
              <span className="font-semibold block">Incident Not Loaded</span>
              <p className="text-[#B5483A]/90">{errorMessage}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchIncident}
                className="!border-[#B5483A]/40 !text-[#B5483A] hover:!bg-[#B5483A]/10"
              >
                Retry
              </Button>
              <Link href="/incidents">
                <Button variant="ghost" size="sm">
                  Return to Registry
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-xs text-[#6B665C]">
            <Spinner size="md" />
            <span>Retrieving incident telemetry and vision assets...</span>
          </div>
        )}

        {/* Results Layout */}
        {!isLoading && incident && (
          <div className="space-y-4">
            {/* Trust Touch: About This Analysis Collapsible */}
            <details className="group rounded-md border border-[#E5E1D8] bg-[#FAF8F4] p-3 text-xs transition-colors">
              <summary className="cursor-pointer font-semibold text-[#1F1D1A] flex items-center justify-between list-none">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F1D1A]" />
                  <span>About this analysis</span>
                </span>
                <span className="text-[10px] text-[#6B665C] group-open:rotate-180 transition-transform">
                  &#9660;
                </span>
              </summary>
              <div className="mt-2.5 pt-2 border-t border-[#E5E1D8] space-y-1.5 text-[#6B665C] leading-relaxed">
                <p>
                  <strong className="text-[#1F1D1A]">1. Evidence Only:</strong> The AI reasoning engine evaluates only deterministic mathematical measurements and bounding box coordinates, never receiving raw image pixels.
                </p>
                <p>
                  <strong className="text-[#1F1D1A]">2. Heuristic Limits:</strong> Automated vision detections and posture classifications are heuristics that may be inaccurate, incomplete, or produce false positives.
                </p>
                <p>
                  <strong className="text-[#1F1D1A]">3. User-Entered Location:</strong> All geographic references and location labels are user-entered field notes and do not establish verified real-world satellite GPS coordinates.
                </p>
                <p>
                  <strong className="text-[#1F1D1A]">4. Decision Support Only:</strong> This tool is engineered strictly to assist human responders during triage and does not replace human verification, clinical judgement, or incident command authority.
                </p>
              </div>
            </details>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Visual Detection Evidence with SVG Overlay (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              <Panel
                title="Visual Detection Evidence"
                subtitle={`Processed resolution: ${incident.image_width} &times; ${incident.image_height}px &bull; Detection count: ${incident.detection_result.person_count}`}
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedDetectionId(null);
                      setHoveredDetectionId(null);
                    }}
                  >
                    Clear Selection
                  </Button>
                }
              >
                <ImageOverlay
                  imageUrl={api.getIncidentImageUrl(incident.id)}
                  originalWidth={incident.image_width}
                  originalHeight={incident.image_height}
                  detections={incident.detection_result.detections}
                  horizontalCandidates={
                    incident.scene_features.horizontal_candidates
                  }
                  selectedId={selectedDetectionId}
                  hoveredId={hoveredDetectionId}
                  onSelectDetection={(detId) => setSelectedDetectionId(detId)}
                  onHoverDetection={(detId) => setHoveredDetectionId(detId)}
                />

                {/* Untrusted User Context (Safely rendered text) */}
                {(incident.location || incident.user_note) && (
                  <div className="mt-4 p-3 rounded bg-[#FAF8F4] border border-[#E5E1D8] text-xs text-[#6B665C] space-y-2">
                    {incident.location?.address && (
                      <p>
                        <strong className="text-[#1F1D1A]">Location Reference:</strong>{" "}
                        <span>{incident.location.address}</span>
                      </p>
                    )}
                    {incident.location?.latitude != null && incident.location?.longitude != null && (
                      <div className="space-y-1.5 pt-1 border-t border-[#E5E1D8]">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-[#1F1D1A] font-semibold">
                            {incident.location.latitude.toFixed(5)}, {incident.location.longitude.toFixed(5)}
                          </span>
                          <span className="text-[10px] font-semibold text-[#5B6B3A] bg-[#F4F6EE] px-1.5 py-0.5 rounded border border-[#D4DCBF] uppercase tracking-wide">
                            Location entered by user
                          </span>
                        </div>
                        <div className="rounded overflow-hidden border border-[#E5E1D8]">
                          <MapView
                            incidents={[
                              {
                                id: incident.id,
                                created_at: incident.created_at,
                                severity: incident.assessment.urgency_level,
                                person_count: incident.detection_result.person_count,
                                location_label: incident.location.address,
                                latitude: incident.location.latitude,
                                longitude: incident.location.longitude,
                                summary: incident.assessment.summary,
                              },
                            ]}
                            initialCenter={[incident.location.longitude, incident.location.latitude]}
                            initialZoom={14}
                            height="180px"
                          />
                        </div>
                      </div>
                    )}
                    {incident.user_note && (
                      <p className="pt-1 border-t border-[#E5E1D8]">
                        <strong className="text-[#1F1D1A]">Field Observation Note:</strong>{" "}
                        <span>{incident.user_note}</span>
                      </p>
                    )}
                  </div>
                )}
              </Panel>
            </div>

            {/* Right Column: Panel 1 Observed + Panel 2 Interpreted (5 Cols) */}
            <div className="lg:col-span-5 space-y-5">
              {/* PANEL 1: Observed (Measured Code Evidence) */}
              <Panel
                title="Observed (Measured)"
                subtitle="Deterministic metrics extracted directly from pixel space"
              >
                <div className="space-y-4 text-xs">
                  {/* Metric Stat Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2.5 rounded bg-[#FAF8F4] border border-[#E5E1D8]">
                      <span className="text-[10px] text-[#6B665C] uppercase tracking-wider block">
                        Persons
                      </span>
                      <span className="text-base font-bold text-[#1F1D1A]">
                        {incident.scene_features.person_count}
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-[#FAF8F4] border border-[#E5E1D8]">
                      <span className="text-[10px] text-[#6B665C] uppercase tracking-wider block">
                        Coverage
                      </span>
                      <span className="text-base font-bold text-[#1F1D1A]">
                        {(incident.scene_features.coverage_ratio * 100).toFixed(1)}%
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-[#FAF8F4] border border-[#E5E1D8]">
                      <span className="text-[10px] text-[#6B665C] uppercase tracking-wider block">
                        Low Conf (&lt;0.4)
                      </span>
                      <span className="text-base font-bold text-[#1F1D1A]">
                        {incident.scene_features.low_confidence_count}
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-[#FAF8F4] border border-[#E5E1D8]">
                      <span className="text-[10px] text-[#6B665C] uppercase tracking-wider block">
                        Prone Posture
                      </span>
                      <span className="text-base font-bold text-[#1F1D1A]">
                        {incident.scene_features.horizontal_candidates.length}
                      </span>
                    </div>
                  </div>

                  {/* Telemetry Specifications */}
                  <div className="space-y-1.5 pt-1 text-[11px] text-[#6B665C] border-t border-[#E5E1D8]">
                    <div className="flex justify-between">
                      <span>Vision Model:</span>
                      <span className="font-mono text-[#1F1D1A]">
                        Ultralytics YOLOv8n (Person Class 0)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Inference Latency:</span>
                      <span className="font-mono text-[#1F1D1A]">
                        {incident.timing?.detect_ms ||
                          incident.detection_result.inference_time_ms}{" "}
                        ms
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Spatial Density Category:</span>
                      <span className="font-mono text-[#1F1D1A]">
                        {incident.scene_features.density_category}
                      </span>
                    </div>
                    {/* Thresholds Display */}
                    <div className="pt-1.5 border-t border-[#E5E1D8] space-y-1">
                      <span className="text-[10px] font-semibold text-[#1F1D1A] uppercase tracking-wider block">
                        Thresholds Applied
                      </span>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-mono">
                        <div className="flex justify-between text-[#6B665C] bg-[#FAF8F4] px-1.5 py-0.5 rounded border border-[#E5E1D8]">
                          <span>Det Conf:</span>
                          <span className="text-[#1F1D1A] font-semibold">&ge; 0.25</span>
                        </div>
                        <div className="flex justify-between text-[#6B665C] bg-[#FAF8F4] px-1.5 py-0.5 rounded border border-[#E5E1D8]">
                          <span>Low Conf:</span>
                          <span className="text-[#1F1D1A] font-semibold">&lt; 0.40</span>
                        </div>
                        <div className="flex justify-between text-[#6B665C] bg-[#FAF8F4] px-1.5 py-0.5 rounded border border-[#E5E1D8]">
                          <span>Prone (w/h):</span>
                          <span className="text-[#1F1D1A] font-semibold">&ge; 1.20</span>
                        </div>
                        <div className="flex justify-between text-[#6B665C] bg-[#FAF8F4] px-1.5 py-0.5 rounded border border-[#E5E1D8]">
                          <span>Edge Margin:</span>
                          <span className="text-[#1F1D1A] font-semibold">5px (max 1)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Detections Table */}
                  <div className="space-y-2 pt-2 border-t border-[#E5E1D8]">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#1F1D1A]">
                      <span>Detected Person Boxes</span>
                      <span className="text-[10px] text-[#6B665C]">
                        Keyboard &bull; Enter to select
                      </span>
                    </div>

                    {incident.detection_result.detections.length === 0 ? (
                      <p className="text-[11px] text-[#8A857A] italic py-1">
                        No person bounding boxes detected in visual frame.
                      </p>
                    ) : (
                      <div
                        role="region"
                        aria-label="Detected person bounding boxes"
                        className="max-h-40 overflow-y-auto space-y-1 pr-1"
                      >
                        {incident.detection_result.detections.map((det) => {
                          const isHoriz =
                            incident.scene_features.horizontal_candidates.includes(
                              det.id
                            );
                          const isSelected = selectedDetectionId === det.id;
                          const isHovered = hoveredDetectionId === det.id;

                          return (
                            <div
                              key={det.id}
                              tabIndex={0}
                              role="button"
                              aria-label={`Select detection ${det.id}, confidence ${Math.round(det.confidence * 100)}%, aspect ratio ${det.aspect_ratio.toFixed(2)}${isHoriz ? ", prone candidate" : ""}`}
                              aria-pressed={isSelected}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setSelectedDetectionId(
                                    isSelected ? null : det.id
                                  );
                                }
                              }}
                              onClick={() =>
                                setSelectedDetectionId(
                                  isSelected ? null : det.id
                                )
                              }
                              onMouseEnter={() => setHoveredDetectionId(det.id)}
                              onMouseLeave={() => setHoveredDetectionId(null)}
                              className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors text-[11px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B5483A] ${
                                isSelected
                                  ? "bg-[#FAF0EE] border border-[#B5483A] text-[#B5483A] font-medium"
                                  : isHovered
                                  ? "bg-[#FAF8F4] text-[#1F1D1A]"
                                  : "bg-[#FFFFFF] border border-[#E5E1D8] text-[#1F1D1A]"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    isSelected
                                      ? "bg-[#B5483A]"
                                      : isHoriz
                                      ? "bg-[#B7791F]"
                                      : "bg-[#5B6B3A]"
                                  }`}
                                />
                                <span className="font-mono font-semibold">
                                  {det.id}
                                </span>
                                {isHoriz && (
                                  <span className="text-[9px] px-1 py-0.2 bg-[#FBF5EB] border border-[#ECD6AD] text-[#B7791F] rounded">
                                    Prone
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3 font-mono text-[10px] text-[#6B665C]">
                                <span>Conf: {Math.round(det.confidence * 100)}%</span>
                                <span>w/h: {det.aspect_ratio.toFixed(2)}</span>
                                <span>Area: {(det.area_fraction * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </Panel>

              {/* PANEL 2: Interpreted (AI Assessment) */}
              <Panel
                title="Interpreted (AI)"
                subtitle="Structured triage evaluation based strictly on measured evidence"
              >
                <div className="space-y-4 text-xs">
                  {/* Priority & Category Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E1D8]">
                    <div className="flex items-center gap-2">
                      <SeverityBadge level={incident.assessment.urgency_level} />
                      {incident.assessment.category && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-[#FAF8F4] border border-[#E5E1D8] font-mono text-[#1F1D1A]">
                          {incident.assessment.category}
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-[#6B665C] font-mono">
                      Confidence:{" "}
                      {Math.round(incident.assessment.confidence_in_assessment * 100)}%
                    </span>
                  </div>

                  {/* Executive Summary */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[#1F1D1A] uppercase tracking-wide block">
                      Executive Summary
                    </span>
                    <p className="text-xs text-[#1F1D1A] leading-relaxed bg-[#FAF8F4] p-2.5 rounded border border-[#E5E1D8]">
                      {incident.assessment.summary}
                    </p>
                  </div>

                  {/* Evidentiary Claims with Clickable Ref Chips */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-[#1F1D1A] uppercase tracking-wide block">
                      Evidentiary Rationale & Citations
                    </span>
                    <ul className="space-y-1.5">
                      {incident.assessment.rationale.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs text-[#6B665C]"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1F1D1A] mt-1.5 shrink-0" />
                          <span className="leading-normal">{item}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Interactive Evidence Reference Chips */}
                    {incident.assessment.evidence_refs &&
                      incident.assessment.evidence_refs.length > 0 && (
                        <div className="pt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-[#6B665C] font-medium mr-1">
                            Cited Evidence:
                          </span>
                          {incident.assessment.evidence_refs.map((ref) => {
                            const isSelected = selectedDetectionId === ref;
                            return (
                              <button
                                key={ref}
                                type="button"
                                onClick={() => handleEvidenceChipClick(ref)}
                                title={`Click to locate ${ref} in visual overlay`}
                                className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                                  isSelected
                                    ? "bg-[#FAF0EE] border-[#B5483A] text-[#B5483A] font-semibold"
                                    : "bg-[#FAF8F4] border-[#E5E1D8] text-[#1F1D1A] hover:border-[#8A857A]"
                                }`}
                              >
                                {ref}
                              </button>
                            );
                          })}
                        </div>
                      )}
                  </div>

                  {/* Recommended Actions */}
                  {incident.assessment.recommended_actions &&
                    incident.assessment.recommended_actions.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-[#E5E1D8]">
                        <span className="text-[11px] font-semibold text-[#1F1D1A] uppercase tracking-wide block">
                          Recommended Operational Actions
                        </span>
                        <ul className="space-y-1">
                          {incident.assessment.recommended_actions.map(
                            (action, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-1.5 text-xs text-[#1F1D1A]"
                              >
                                <span className="text-[#5B6B3A] font-bold">
                                  &rarr;
                                </span>
                                <span>{action}</span>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                  {/* Operational Caveats & Limitations */}
                  {incident.assessment.warnings &&
                    incident.assessment.warnings.length > 0 && (
                      <div className="p-2.5 rounded bg-[#FAF8F4] border border-[#E5E1D8] space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#B7791F] block">
                          Operational Limitations
                        </span>
                        {incident.assessment.warnings.map((w, idx) => (
                          <p
                            key={idx}
                            className="text-[11px] text-[#6B665C] leading-relaxed"
                          >
                            {w}
                          </p>
                        ))}
                      </div>
                    )}

                  {/* Honest Source Label */}
                  <div className="pt-2 border-t border-[#E5E1D8] flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#6B665C]">
                    <div>
                      {incident.assessment.source === "groq_llm" ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-[#1F1D1A]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5B6B3A]" />
                          <span>AI Source: openai/gpt-oss-120b</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-medium text-[#B7791F]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#B7791F]" />
                          <span>
                            Rule-based fallback (AI unavailable
                            {incident.assessment.fallback_reason
                              ? `: ${incident.assessment.fallback_reason}`
                              : ""}
                            )
                          </span>
                        </span>
                      )}
                    </div>

                    {incident.timing && (
                      <span className="font-mono">
                        Total: {incident.timing.total_ms}ms (det:{" "}
                        {incident.timing.detect_ms}ms &bull; reason:{" "}
                        {incident.timing.reason_ms}ms)
                      </span>
                    )}
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        </div>
        )}
      </div>
  );
}

function IncidentDetailLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  return <IncidentDetailContent id={id} />;
}

export default function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <AppShell>
      <React.Suspense
        fallback={
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-xs text-[#6B665C]">
            <Spinner size="md" />
            <span>Loading incident details...</span>
          </div>
        }
      >
        <IncidentDetailLoader params={params} />
      </React.Suspense>
    </AppShell>
  );
}

