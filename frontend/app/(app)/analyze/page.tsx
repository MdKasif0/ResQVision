"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AppShell,
  Button,
  ImageOverlay,
  Panel,
  SeverityBadge,
  Spinner,
} from "@/components";
import { api, ApiClientError } from "@/lib/api";
import { downscaleImageIfNeeded } from "@/lib/image";
import type { Incident, SampleItem } from "@/lib/types";

type ProcessingStage = "idle" | "uploading" | "analyzing" | "done" | "error";

const MAX_UPLOAD_MB = 8;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const CURATED_SAMPLES: SampleItem[] = [
  {
    id: "sample_people_crowd",
    filename: "sample_people_crowd.jpg",
    name: "Crowd Scene (Urban)",
    description: "4 persons identified with normal spatial dispersion and coverage metrics.",
    expected_persons: 4,
  },
  {
    id: "sample_person_single",
    filename: "sample_person_single.jpg",
    name: "Search & Rescue Scene",
    description: "2 subjects identified including 1 prone candidate (w/h >= 1.2).",
    expected_persons: 2,
  },
  {
    id: "sample_empty_landscape",
    filename: "sample_empty_landscape.jpg",
    name: "Empty Terrain (Wildland)",
    description: "Zero human subjects detected; verifies 0-count edge case.",
    expected_persons: 0,
  },
];

const getTimestampMs = () => Date.now();

export default function AnalyzePage() {
  // Upload and form state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [downscaleNotice, setDownscaleNotice] = useState<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Execution state
  const [stage, setStage] = useState<ProcessingStage>("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [clientElapsedMs, setClientElapsedMs] = useState<number | null>(null);

  // Benchmark samples
  const [samples, setSamples] = useState<SampleItem[]>(CURATED_SAMPLES);
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);

  // Analysis result state
  const [incident, setIncident] = useState<Incident | null>(null);
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);
  const [hoveredDetectionId, setHoveredDetectionId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch available samples on mount
  useEffect(() => {
    let isMounted = true;
    api
      .listSamples()
      .then((data) => {
        if (isMounted && data && data.length > 0) {
          setSamples(data);
        }
      })
      .catch(() => {
        // Fallback to static sample registry definitions
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Cleanup voice recording timer and media streams on unmount
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const validateAndSetFile = async (candidate: File) => {
    setErrorMessage(null);
    setErrorCode(null);
    setDownscaleNotice(null);

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

    // Client-side downscaling for large images (>1920px) preserving exact aspect ratio
    try {
      const result = await downscaleImageIfNeeded(candidate, 1920);
      const chosenFile = result.file;
      if (result.downscaled) {
        setDownscaleNotice(
          `Optimized: ${result.originalWidth}×${result.originalHeight}px downscaled to ${result.width}×${result.height}px (${(result.newSizeBytes / 1024).toFixed(1)} KB) for fast upload.`
        );
      }
      setFile(chosenFile);
      const objectUrl = URL.createObjectURL(chosenFile);
      setPreviewUrl(objectUrl);
      setStage("idle");
      setIncident(null);
      setSelectedDetectionId(null);
      setHoveredDetectionId(null);
      setClientElapsedMs(null);
      return true;
    } catch {
      // Fallback to original candidate if downscale fails
      setFile(candidate);
      const objectUrl = URL.createObjectURL(candidate);
      setPreviewUrl(objectUrl);
      setStage("idle");
      setIncident(null);
      setSelectedDetectionId(null);
      setHoveredDetectionId(null);
      setClientElapsedMs(null);
      return true;
    }
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
    setClientElapsedMs(null);
    setDownscaleNotice(null);
    setSelectedDetectionId(null);
    setHoveredDetectionId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalyze = async () => {
    if (!file || isSubmittingRef.current || isSubmitting) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);
    setErrorCode(null);
    setStage("uploading");
    const startTime = getTimestampMs();

    try {
      const result = await api.analyze(
        {
          file,
          note: note.trim() || undefined,
          location_label: locationLabel.trim() || undefined,
        },
        (phase) => {
          setStage(phase);
        }
      );

      const elapsed = getTimestampMs() - startTime;
      setClientElapsedMs(elapsed);
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
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleLoadSample = async (sampleId: string) => {
    if (isSubmittingRef.current || isSubmitting) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setLoadingSampleId(sampleId);
    setErrorMessage(null);
    setErrorCode(null);
    setStage("analyzing");
    const startTime = getTimestampMs();

    try {
      const result = await api.loadSample(sampleId);
      const elapsed = getTimestampMs() - startTime;
      setClientElapsedMs(elapsed);
      setIncident(result);
      setPreviewUrl(api.getIncidentImageUrl(result.id));
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
        setErrorMessage("Failed to run benchmark pipeline on sample image.");
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setLoadingSampleId(null);
    }
  };

  // Voice note recording via MediaRecorder
  const startRecording = async () => {
    setVoiceError(null);
    audioChunksRef.current = [];

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setVoiceError("Audio recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType || "audio/webm",
        });

        if (audioBlob.size < 500) {
          // Recording too short or empty
          return;
        }

        setIsTranscribing(true);
        try {
          const res = await api.transcribeAudio(audioBlob);
          if (res.text) {
            setNote((prev) => (prev.trim() ? `${prev.trim()} ${res.text}` : res.text));
          }
        } catch (err) {
          const msg =
            err instanceof Error
              ? err.message
              : "Transcription service unavailable (GROQ_API_KEY required).";
          setVoiceError(msg);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      // 60-second cap timer
      let elapsed = 0;
      recordTimerRef.current = setInterval(() => {
        elapsed += 1;
        setRecordingSeconds(elapsed);
        if (elapsed >= 60) {
          stopRecording();
        }
      }, 1000);
    } catch (err: unknown) {
      const errName = err instanceof Error ? err.name : "";
      if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
        setVoiceError("Microphone access was denied. You can enter field observations manually.");
      } else {
        setVoiceError("Could not access microphone. You can enter field observations manually.");
      }
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
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

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header Bar */}
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

        {/* Global Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="p-4 rounded-md bg-[#FAF0EE] border border-[#E8C4BE] text-[#B5483A] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-subtle"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#B5483A]" />
                <span>Analysis Failed {errorCode ? `[${errorCode}]` : ""}</span>
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

        {/* Real Progress Indicator */}
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

        {/* Primary View: Upload & Intake vs Results */}
        {!incident ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Dropzone and Sample Selector */}
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
                  <div className="space-y-4">
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
                            Click to browse or drop field image here
                          </p>
                          <p className="text-[11px] text-[#6B665C]">
                            JPEG, PNG, WebP &bull; Auto-scaled to &le;1920px for fast upload
                          </p>
                        </div>

                        <div className="pt-2">
                          <span className="inline-block px-2.5 py-1 text-[11px] font-medium bg-[#FAF8F4] border border-[#E5E1D8] rounded text-[#1F1D1A]">
                            Select File
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Benchmark Sample Selector */}
                    <div className="p-3.5 rounded-md bg-[#FAF8F4] border border-[#E5E1D8] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#1F1D1A]">
                          Evaluate Curated Benchmark Samples:
                        </span>
                        <span className="text-[10px] text-[#6B665C] font-mono">
                          Real YOLO inference
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {samples.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleLoadSample(s.id)}
                            className="p-2.5 text-left rounded border border-[#E5E1D8] bg-[#FFFFFF] hover:border-[#1F1D1A] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F1D1A] group"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-semibold text-[#1F1D1A] truncate group-hover:text-[#B5483A] transition-colors">
                                {s.name}
                              </span>
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#FAF0EE] border border-[#E8C4BE] text-[#B5483A] font-bold shrink-0">
                                SAMPLE
                              </span>
                            </div>
                            <p className="text-[10px] text-[#6B665C] mt-1 line-clamp-2 leading-tight">
                              {s.description}
                            </p>
                            {loadingSampleId === s.id && (
                              <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-[#B5483A] font-medium">
                                <Spinner size="sm" />
                                <span>Running inference...</span>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Staged Image Preview with downscale metrics */
                  <div className="space-y-4">
                    <div className="relative rounded-md overflow-hidden bg-[#1F1D1A] border border-[#E5E1D8] max-h-[360px] flex items-center justify-center p-2">
                      <img
                        src={previewUrl}
                        alt="Upload preview"
                        className="max-h-[340px] max-w-full h-auto w-auto object-contain block mx-auto rounded-[2px]"
                      />
                    </div>

                    <div className="p-3 rounded-md bg-[#FAF8F4] border border-[#E5E1D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#5B6B3A]" />
                          <span className="text-xs font-semibold text-[#1F1D1A] truncate">
                            {file?.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6B665C] font-mono">
                          {file ? (file.size / 1024).toFixed(1) : 0} KB &bull; {file?.type}
                        </p>
                        {downscaleNotice && (
                          <p className="text-[10px] text-[#5B6B3A] font-medium">
                            {downscaleNotice}
                          </p>
                        )}
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

            {/* Right: Operational Telemetry & Guarantees */}
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

                  {/* Note Field with Voice Dictation */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="user-note"
                        className="block text-xs font-medium text-[#1F1D1A]"
                      >
                        Field Observations / Note (Optional)
                      </label>

                      {/* Microphone Dictation Button */}
                      <button
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isTranscribing}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#1F1D1A] ${
                          isRecording
                            ? "bg-[#FAF0EE] border-[#B5483A] text-[#B5483A]"
                            : "bg-[#FAF8F4] border-[#E5E1D8] text-[#6B665C] hover:text-[#1F1D1A]"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isRecording
                              ? "bg-[#B5483A] animate-pulse"
                              : "bg-[#8A857A]"
                          }`}
                        />
                        {isRecording ? (
                          <span>Stop ({recordingSeconds}s / 60s)</span>
                        ) : isTranscribing ? (
                          <span className="flex items-center gap-1">
                            <Spinner size="sm" />
                            <span>Transcribing...</span>
                          </span>
                        ) : (
                          <span>Voice Note</span>
                        )}
                      </button>
                    </div>

                    {voiceError && (
                      <p className="text-[11px] text-[#B5483A] mb-1.5 bg-[#FAF0EE] p-1.5 rounded border border-[#E8C4BE]">
                        {voiceError}
                      </p>
                    )}

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
                        "Analyze"
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
             RESULTS LAYOUT
             Left: Image with SVG Coordinate Overlay (7 Cols)
             Right: Panel 1 Observed + Panel 2 Interpreted (5 Cols)
             =============================================================== */
          <div className="space-y-4">
            {/* Persistence Status & Visible Badge */}
            <div className="p-3 rounded-md bg-[#FAF8F4] border border-[#E5E1D8] text-xs text-[#1F1D1A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-subtle">
              <div className="flex flex-wrap items-center gap-2">
                {incident.origin === "sample" ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#FAF0EE] border border-[#B5483A] text-[#B5483A]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B5483A]" />
                    <span>BENCHMARK SAMPLE</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#FAF8F4] border border-[#5B6B3A]/40 text-[#5B6B3A]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B6B3A]" />
                    <span>LIVE ANALYSIS</span>
                  </span>
                )}

                <span>
                  <strong>Incident Persisted:</strong> Record saved to registry as{" "}
                  <code className="font-mono text-[11px] bg-[#FFFFFF] px-1.5 py-0.5 rounded border border-[#E5E1D8]">
                    {incident.id.slice(0, 8)}...
                  </code>
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/incidents/${encodeURIComponent(incident.id)}`}>
                  <Button variant="outline" size="sm" className="!py-1 !px-2.5 text-xs">
                    Inspect in Registry &rarr;
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelectedFile}
                  className="!py-1 !px-2.5 text-xs"
                >
                  New Analysis
                </Button>
              </div>
            </div>

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
              {/* Left Column: Bounding Box Annotated Image (7 Cols) */}
              <div className="lg:col-span-7 space-y-4">
                <Panel
                  title="Visual Detection Evidence"
                  subtitle={`Processed resolution: ${incident.image_width} × ${incident.image_height}px • Detections: ${incident.detection_result.person_count}`}
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

                  {/* User Context Bar if supplied */}
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
                  title="Observed (measured)"
                  subtitle="Deterministic metrics extracted directly from pixel space"
                >
                  <div className="space-y-4 text-xs">
                    {/* Metric Stat Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2.5 rounded bg-[#FAF8F4] border border-[#E5E1D8]">
                        <span className="text-[10px] text-[#6B665C] uppercase tracking-wider block">
                          Person Count
                        </span>
                        <span className="text-base font-bold text-[#1F1D1A]">
                          {incident.scene_features.person_count}
                        </span>
                      </div>

                      <div className="p-2.5 rounded bg-[#FAF8F4] border border-[#E5E1D8]">
                        <span className="text-[10px] text-[#6B665C] uppercase tracking-wider block">
                          Coverage Ratio
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

                    {/* Telemetry & Thresholds Specifications */}
                    <div className="space-y-2 pt-1 text-[11px] text-[#6B665C] border-t border-[#E5E1D8]">
                      <div className="flex justify-between">
                        <span>Vision Model:</span>
                        <span className="font-mono text-[#1F1D1A]">
                          Ultralytics YOLOv8n (Person Class 0)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Vision Latency:</span>
                        <span className="font-mono text-[#1F1D1A]">
                          {incident.timing?.detect_ms ??
                            incident.detection_result.inference_time_ms}{" "}
                          ms
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Spatial Density:</span>
                        <span className="font-mono text-[#1F1D1A]">
                          {incident.scene_features.density_category}
                        </span>
                      </div>

                      {/* Thresholds Display */}
                      <div className="pt-1.5 border-t border-[#E5E1D8] space-y-1">
                        <span className="text-[10px] font-semibold text-[#1F1D1A] uppercase tracking-wider block">
                          Thresholds Used:
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

                    {/* Interactive Detections Table with Full Keyboard Accessibility */}
                    <div className="space-y-2 pt-2 border-t border-[#E5E1D8]">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#1F1D1A]">
                        <span>Observed Person Detections</span>
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
                      <ul className="space-y-2">
                        {incident.assessment.rationale.map((item, idx) => {
                          // Extract referenced detection IDs (e.g. p1, p2) or matched evidence refs for this claim
                          const claimRefs = (incident.assessment.evidence_refs || []).filter(
                            (ref) => item.includes(ref) || (ref === "horizontal_candidates" && item.toLowerCase().includes("horizontal"))
                          );

                          return (
                            <li
                              key={idx}
                              className="p-2 rounded bg-[#FAF8F4] border border-[#E5E1D8] space-y-1.5"
                            >
                              <div className="flex items-start gap-2 text-xs text-[#1F1D1A]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#1F1D1A] mt-1.5 shrink-0" />
                                <span className="leading-normal">{item}</span>
                              </div>
                              {claimRefs.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 pl-3.5 pt-0.5">
                                  <span className="text-[9px] text-[#6B665C] uppercase tracking-wider font-semibold">
                                    Refs:
                                  </span>
                                  {claimRefs.map((ref) => {
                                    const isSelected = selectedDetectionId === ref;
                                    return (
                                      <button
                                        key={ref}
                                        type="button"
                                        onClick={() => handleEvidenceChipClick(ref)}
                                        title={`Click to locate ${ref} in visual overlay`}
                                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded border transition-colors ${
                                          isSelected
                                            ? "bg-[#FAF0EE] border-[#B5483A] text-[#B5483A] font-semibold"
                                            : "bg-[#FFFFFF] border-[#E5E1D8] text-[#1F1D1A] hover:border-[#8A857A]"
                                        }`}
                                      >
                                        {ref}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>

                      {/* Interactive Evidence Reference Chips */}
                      {incident.assessment.evidence_refs &&
                        incident.assessment.evidence_refs.length > 0 && (
                          <div className="pt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] text-[#6B665C] font-medium mr-1">
                              All Cited Evidence:
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

                    {/* Uncertainty & Assessment Confidence */}
                    <div className="space-y-1 pt-2 border-t border-[#E5E1D8]">
                      <span className="text-[11px] font-semibold text-[#1F1D1A] uppercase tracking-wide block">
                        Uncertainty & Assessment Confidence
                      </span>
                      <p className="text-xs text-[#6B665C] bg-[#FAF8F4] p-2.5 rounded border border-[#E5E1D8] leading-relaxed">
                        Confidence rated at {Math.round(incident.assessment.confidence_in_assessment * 100)}%. Bounding box posture classifications (w/h &ge; 1.2) are weak geometric heuristics and carry inherent uncertainty. Field responders must visually verify physical welfare before clinical or dispatch escalation.
                      </p>
                    </div>

                    {/* Recommended Actions */}
                    {incident.assessment.recommended_actions &&
                      incident.assessment.recommended_actions.length > 0 && (
                        <div className="space-y-1 pt-2 border-t border-[#E5E1D8]">
                          <span className="text-[11px] font-semibold text-[#1F1D1A] uppercase tracking-wide block">
                            Recommended Actions
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

                    {/* Honest Source Label & Real Performance Metrics */}
                    <div className="pt-2 border-t border-[#E5E1D8] space-y-1.5 text-[10px] text-[#6B665C]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          {incident.assessment.source === "groq_llm" ? (
                            <span className="inline-flex items-center gap-1.5 font-medium text-[#1F1D1A]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#5B6B3A]" />
                              <span>AI Engine: openai/gpt-oss-120b</span>
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
                            Backend: {incident.timing.total_ms}ms (det:{" "}
                            {incident.timing.detect_ms}ms &bull; reason:{" "}
                            {incident.timing.reason_ms}ms)
                          </span>
                        )}
                      </div>

                      {clientElapsedMs !== null && (
                        <div className="flex justify-between font-mono text-[10px] text-[#1F1D1A] pt-0.5 border-t border-[#E5E1D8]/60">
                          <span>Client Total Request Elapsed:</span>
                          <span className="font-semibold text-[#5B6B3A]">
                            {clientElapsedMs} ms
                          </span>
                        </div>
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
