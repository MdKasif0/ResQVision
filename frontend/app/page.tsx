"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import {
  AppShell,
  Button,
  EmptyState,
  ImageOverlay,
  Panel,
  SeverityBadge,
  Spinner,
  StatusLine,
} from "@/components";
import { api, ApiClientError } from "@/lib/api";
import type { Detection, Incident } from "@/lib/types";

type ProcessingStage = "idle" | "uploading" | "analyzing" | "done" | "error";

const MAX_UPLOAD_MB = 8;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function AnalyzePage() {
  // Upload and form state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Execution state
  const [stage, setStage] = useState<ProcessingStage>("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Analysis result state
  const [incident, setIncident] = useState<Incident | null>(null);
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);
  const [hoveredDetectionId, setHoveredDetectionId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (candidate: File) => {
    setErrorMessage(null);
    setErrorCode(null);

    if (!ALLOWED_TYPES.includes(candidate.type)) {
      setErrorCode("INVALID_IMAGE_FORMAT");
      setErrorMessage(
        `Unsupported media type "${candidate.type}". Accepted formats are JPEG, PNG, and WebP.`
      );
      return false;
    }

    if (candidate.size > MAX_UPLOAD_BYTES) {
      setErrorCode("PAYLOAD_TOO_LARGE");
      setErrorMessage(
        `File size (${(candidate.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of ${MAX_UPLOAD_MB}MB.`
      );
      return false;
    }

    if (candidate.size === 0) {
      setErrorCode("EMPTY_FILE");
      setErrorMessage("Selected file is empty (0 bytes).");
      return false;
    }

    setFile(candidate);
    const objectUrl = URL.createObjectURL(candidate);
    setPreviewUrl(objectUrl);
    setStage("idle");
    setIncident(null);
    setSelectedDetectionId(null);
    setHoveredDetectionId(null);
    return true;
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const clearSelectedFile = () => {
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setIncident(null);
    setStage("idle");
    setErrorMessage(null);
    setErrorCode(null);
    setSelectedDetectionId(null);
    setHoveredDetectionId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalyze = async () => {
    if (!file || isSubmitting) return;

    // Guard against duplicate submission
    setIsSubmitting(true);
    setErrorMessage(null);
    setErrorCode(null);
    setStage("uploading");

    try {
      // Transition stage to analyzing as request processes
      const analyzePromise = api.analyze({
        file,
        note: note.trim() || undefined,
        location_label: locationLabel.trim() || undefined,
      });

      // Show real analysis stage progression
      const timeoutId = setTimeout(() => {
        setStage("analyzing");
      }, 300);

      const result = await analyzePromise;
      clearTimeout(timeoutId);

      setIncident(result);
      setStage("done");
    } catch (err) {
      setStage("error");
      if (err instanceof ApiClientError) {
        setErrorCode(err.code);
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorCode("CONNECTION_ERROR");
        setErrorMessage(err.message);
      } else {
        setErrorCode("REQUEST_FAILED");
        setErrorMessage("An unexpected error occurred during incident analysis.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to highlight boxes when clicking evidence refs
  const handleEvidenceChipClick = (ref: string) => {
    if (!incident) return;
    const isDetId = incident.detection_result.detections.some((d) => d.id === ref);
    if (isDetId) {
      setSelectedDetectionId(selectedDetectionId === ref ? null : ref);
    } else if (ref === "horizontal_candidates") {
      const firstCandidate = incident.scene_features.horizontal_candidates[0];
      setSelectedDetectionId(selectedDetectionId === firstCandidate ? null : firstCandidate || null);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Title & Operational Context */}
        <div className="border-b border-[#E5E1D8] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1F1D1A]">
              Incident Analysis & Triage
            </h1>
            <p className="text-xs text-[#6B665C] mt-1">
              Deterministic vision detection &bull; Pure feature extraction &bull;
              Evidentiary reasoning without raw pixel transmission
            </p>
          </div>

          {incident && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Link href={`/incidents/${encodeURIComponent(incident.id)}`}>
                <Button variant="outline" size="sm">
                  View in Incident Registry &rarr;
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelectedFile}
              >
                Analyze New Image
              </Button>
            </div>
          )}
        </div>


        {/* Global Error Banner (Standard error display with honest retry) */}
        {errorMessage && (
          <div
            role="alert"
            className="p-4 rounded-md bg-[#FAF0EE] border border-[#E8C4BE] text-[#B5483A] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-subtle"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#B5483A]" />
                <span>
                  Analysis Failed {errorCode ? `[${errorCode}]` : ""}
                </span>
              </div>
              <p className="text-[#B5483A]/90 leading-relaxed">{errorMessage}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setErrorMessage(null);
                  setErrorCode(null);
                  if (file) handleAnalyze();
                }}
                className="!border-[#B5483A]/40 !text-[#B5483A] hover:!bg-[#B5483A]/10"
              >
                Retry
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelectedFile}
                className="!text-[#B5483A]/80 hover:!bg-[#B5483A]/10"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Staged Progress Line (Reflects real phases without fake delays) */}
        {isSubmitting && (
          <div className="p-3 rounded-md bg-[#FFFFFF] border border-[#E5E1D8] shadow-subtle space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#1F1D1A] flex items-center gap-2">
                <Spinner size="sm" />
                <span>
                  {stage === "uploading"
                    ? "Phase 1: Transmitting payload..."
                    : "Phase 2: Vision inference & evidentiary synthesis..."}
                </span>
              </span>
              <span className="text-[11px] font-mono text-[#6B665C]">
                Active Pipeline
              </span>
            </div>

            {/* Visual Step Indicator */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
              <div
                className={`flex items-center gap-1.5 p-1.5 rounded border transition-colors ${
                  stage === "uploading"
                    ? "bg-[#FAF8F4] border-[#1F1D1A] text-[#1F1D1A] font-medium"
                    : "bg-[#F3F2F0] border-[#E5E1D8] text-[#5B6B3A]"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    stage === "uploading" ? "bg-[#1F1D1A] animate-pulse" : "bg-[#5B6B3A]"
                  }`}
                />
                <span>1. Upload</span>
              </div>

              <div
                className={`flex items-center gap-1.5 p-1.5 rounded border transition-colors ${
                  stage === "analyzing"
                    ? "bg-[#FAF8F4] border-[#1F1D1A] text-[#1F1D1A] font-medium"
                    : "bg-[#F3F2F0] border-[#E5E1D8] text-[#8A857A]"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    stage === "analyzing" ? "bg-[#1F1D1A] animate-pulse" : "bg-[#8A857A]"
                  }`}
                />
                <span>2. Vision & Reasoning</span>
              </div>

              <div className="flex items-center gap-1.5 p-1.5 rounded border bg-[#F3F2F0] border-[#E5E1D8] text-[#8A857A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8A857A]" />
                <span>3. Completed</span>
              </div>
            </div>
          </div>
        )}

        {/* Primary Workspace: Pre-Analysis Upload vs Post-Analysis Results */}
        {!incident ? (
          /* Intake & Configuration Panel */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Section: File Dropzone & Previews (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              <Panel
                title="Scene Imagery Intake"
                subtitle="Upload aerial, drone, or ground photo (JPEG, PNG, WebP &le; 8MB)"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {!previewUrl ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors duration-150 ${
                      isDragging
                        ? "border-[#1F1D1A] bg-[#FAF8F4]"
                        : "border-[#E5E1D8] hover:border-[#8A857A] bg-[#FFFFFF]"
                    }`}
                  >
                    <div className="max-w-xs mx-auto space-y-3">
                      <div className="w-10 h-10 rounded-full bg-[#FAF8F4] border border-[#E5E1D8] flex items-center justify-center mx-auto text-[#1F1D1A]">
                        <svg
                          className="w-5 h-5 text-[#1F1D1A]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                          />
                        </svg>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-[#1F1D1A]">
                          Click to browse or drop image here
                        </p>
                        <p className="text-[11px] text-[#6B665C]">
                          Accepted: JPEG, PNG, WebP up to 8MB
                        </p>
                      </div>

                      <div className="pt-2">
                        <span className="inline-block px-2.5 py-1 text-[11px] font-medium bg-[#FAF8F4] border border-[#E5E1D8] rounded text-[#1F1D1A]">
                          Select File
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Staged Image Preview with metadata */
                  <div className="space-y-4">
                    <div className="relative rounded-md overflow-hidden bg-[#1F1D1A] border border-[#E5E1D8] max-h-[360px] flex items-center justify-center">
                      <img
                        src={previewUrl}
                        alt="Upload preview"
                        className="w-full h-auto max-h-[360px] object-contain block"
                      />
                    </div>

                    <div className="p-3 rounded-md bg-[#FAF8F4] border border-[#E5E1D8] flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5B6B3A]" />
                          <span className="text-xs font-semibold text-[#1F1D1A] truncate">
                            {file?.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6B665C] mt-0.5 font-mono">
                          {file ? (file.size / 1024).toFixed(1) : 0} KB &bull;{" "}
                          {file?.type}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isSubmitting}
                          onClick={clearSelectedFile}
                        >
                          Change
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isSubmitting}
                          onClick={handleAnalyze}
                        >
                          {isSubmitting ? (
                            <span className="flex items-center gap-1.5">
                              <Spinner size="sm" />
                              <span>Processing...</span>
                            </span>
                          ) : (
                            "Run Analysis"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Panel>
            </div>

            {/* Right Section: Optional Metadata & Pipeline Guarantees (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              <Panel
                title="Operational Telemetry"
                subtitle="Optional user annotations and spatial markers"
              >
                <div className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="location-label"
                      className="block text-xs font-medium text-[#1F1D1A] mb-1"
                    >
                      Location Reference (Optional)
                    </label>
                    <input
                      id="location-label"
                      type="text"
                      maxLength={200}
                      value={locationLabel}
                      onChange={(e) => setLocationLabel(e.target.value)}
                      placeholder="e.g. Sector 4 North, Trailhead Marker 12..."
                      className="w-full px-3 py-1.5 rounded border border-[#E5E1D8] bg-[#FFFFFF] text-xs text-[#1F1D1A] placeholder:text-[#8A857A] focus:outline-none focus:border-[#1F1D1A] focus:ring-1 focus:ring-[#1F1D1A]"
                    />
                    <p className="text-[10px] text-[#6B665C] mt-1">
                      Notice: 2D detection does not establish real-world GPS position.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="user-note"
                      className="block text-xs font-medium text-[#1F1D1A] mb-1"
                    >
                      Field Observations / Note (Optional)
                    </label>
                    <textarea
                      id="user-note"
                      rows={3}
                      maxLength={1000}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Reported group separated following landslide event..."
                      className="w-full px-3 py-1.5 rounded border border-[#E5E1D8] bg-[#FFFFFF] text-xs text-[#1F1D1A] placeholder:text-[#8A857A] focus:outline-none focus:border-[#1F1D1A] focus:ring-1 focus:ring-[#1F1D1A] resize-none"
                    />
                    <div className="flex justify-between text-[10px] text-[#8A857A] mt-0.5">
                      <span>Consumed strictly as structured evidence</span>
                      <span>{note.length}/1000</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E5E1D8]">
                    <Button
                      variant="primary"
                      size="md"
                      disabled={!file || isSubmitting}
                      onClick={handleAnalyze}
                      className="w-full justify-center"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <Spinner size="sm" />
                          <span>Running Vision & Evidentiary Synthesis...</span>
                        </span>
                      ) : (
                        "Execute Pipeline"
                      )}
                    </Button>
                  </div>
                </div>
              </Panel>

              {/* Protocol Commitments Panel */}
              <Panel
                title="Integrity Guarantees"
                subtitle="Engineered for mission-critical search and rescue"
              >
                <div className="space-y-2.5 text-xs text-[#6B665C]">
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B6B3A] mt-1.5 shrink-0" />
                    <span>
                      <strong className="text-[#1F1D1A]">Zero Raw Pixel Ingestion:</strong> The AI reasoning model receives strictly mathematical scene telemetry.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B6B3A] mt-1.5 shrink-0" />
                    <span>
                      <strong className="text-[#1F1D1A]">Mandatory Evidence Citations:</strong> Conclusions cite explicit detection IDs or measurement features.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B6B3A] mt-1.5 shrink-0" />
                    <span>
                      <strong className="text-[#1F1D1A]">Deterministic Fallback:</strong> Operates fully offline with rule-based heuristics if AI is unreachable.
                    </span>
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        ) : (
          /* ===============================================================
             RESULTS LAYOUT: Two columns on desktop, stacked on small screens
             Left: Image with SVG/Canvas Overlay (6-7 Cols)
             Right: Panel 1 Observed + Panel 2 Interpreted (5-6 Cols)
             =============================================================== */
          <div className="space-y-4">
            {/* Persistence Status & Direct Link to Saved Incident */}
            <div className="p-3 rounded-md bg-[#FAF8F4] border border-[#E5E1D8] text-xs text-[#1F1D1A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-subtle">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#5B6B3A]" />
                <span>
                  <strong>Incident Persisted:</strong> Record saved to local registry as{" "}
                  <code className="font-mono text-[11px] bg-[#FFFFFF] px-1.5 py-0.5 rounded border border-[#E5E1D8]">
                    {incident.id.slice(0, 8)}...
                  </code>
                </span>
              </div>
              <Link href={`/incidents/${encodeURIComponent(incident.id)}`}>
                <Button variant="outline" size="sm" className="!py-1 !px-2.5 text-xs">
                  Inspect in Registry &rarr;
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Left Column: Bounding Box Annotated Image (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              <Panel
                title="Visual Detection Evidence"
                subtitle={`Processed resolution: ${incident.image_width} &times; ${incident.image_height}px &bull; Detection count: ${incident.detection_result.person_count}`}
                action={
                  <div className="flex items-center gap-2">
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelectedFile}
                    >
                      New Upload
                    </Button>
                  </div>
                }
              >
                {previewUrl && (
                  <ImageOverlay
                    imageUrl={previewUrl}
                    originalWidth={incident.image_width}
                    originalHeight={incident.image_height}
                    detections={incident.detection_result.detections}
                    horizontalCandidates={
                      incident.scene_features.horizontal_candidates
                    }
                    selectedId={selectedDetectionId}
                    hoveredId={hoveredDetectionId}
                    onSelectDetection={(id) => setSelectedDetectionId(id)}
                    onHoverDetection={(id) => setHoveredDetectionId(id)}
                  />
                )}

                {/* Optional User Context Bar if supplied */}
                {(incident.location || incident.user_note) && (
                  <div className="mt-4 p-2.5 rounded bg-[#FAF8F4] border border-[#E5E1D8] text-xs text-[#6B665C] space-y-1">
                    {incident.location?.address && (
                      <p>
                        <strong className="text-[#1F1D1A]">Location Reference:</strong>{" "}
                        {incident.location.address} (user-entered)
                      </p>
                    )}
                    {incident.user_note && (
                      <p>
                        <strong className="text-[#1F1D1A]">Field Note:</strong>{" "}
                        {incident.user_note}
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
                    <div className="flex justify-between">
                      <span>Thresholds Used:</span>
                      <span className="font-mono text-[#1F1D1A]">
                        conf&ge;0.25 &bull; low&lt;0.4 &bull; w/h&ge;1.2
                      </span>
                    </div>
                  </div>

                  {/* Interactive Detections Table */}
                  <div className="space-y-2 pt-2 border-t border-[#E5E1D8]">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#1F1D1A]">
                      <span>Detected Person Boxes</span>
                      <span className="text-[10px] text-[#6B665C]">
                        Hover or click to inspect
                      </span>
                    </div>

                    {incident.detection_result.detections.length === 0 ? (
                      <p className="text-[11px] text-[#8A857A] italic py-1">
                        No person bounding boxes detected in visual frame.
                      </p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                        {incident.detection_result.detections.map((det) => {
                          const isHoriz = incident.scene_features.horizontal_candidates.includes(
                            det.id
                          );
                          const isSelected = selectedDetectionId === det.id;
                          const isHovered = hoveredDetectionId === det.id;

                          return (
                            <div
                              key={det.id}
                              onClick={() =>
                                setSelectedDetectionId(
                                  isSelected ? null : det.id
                                )
                              }
                              onMouseEnter={() => setHoveredDetectionId(det.id)}
                              onMouseLeave={() => setHoveredDetectionId(null)}
                              className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors text-[11px] ${
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
                      Confidence: {Math.round(incident.assessment.confidence_in_assessment * 100)}%
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

    </AppShell>
  );
}
