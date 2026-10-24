"use client";

import React, { useState, useRef } from "react";
import { Button, Panel, StatusLine } from "@/components";

export default function AnalyzePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

  const handleFileChange = (file: File | undefined) => {
    setFileError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setFileError("Invalid file type. Please upload a JPEG or PNG image.");
      setSelectedFile(null);
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(
        `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum limit of 8 MB.`
      );
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileChange(files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-base sm:text-lg font-semibold tracking-tight text-[#1F1D1A]">
          Incident Imagery Analysis
        </h1>
        <p className="text-xs text-[#6B665C] mt-1 max-w-2xl leading-relaxed">
          Upload disaster or field imagery to execute deterministic human
          detection, compute spatial scene telemetry, and generate a
          schema-validated evidentiary assessment.
        </p>
      </div>

      {/* Grid: Upload & Pipeline Explanation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Staging / Upload (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Panel
            title="Image Ingestion"
            subtitle="Accepted formats: JPEG or PNG up to 8.0 MB"
          >
            {/* Dropzone Container */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center cursor-pointer transition-colors duration-150 ${
                isDragging
                  ? "border-[#1F1D1A] bg-[#FAF8F4]"
                  : "border-[#E5E1D8] hover:border-[#8A857A] bg-[#FFFFFF]"
              }`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              aria-label="Upload incident image file"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
              />

              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-md bg-[#FAF8F4] border border-[#E5E1D8] flex items-center justify-center text-[#1F1D1A] mb-3">
                  <svg
                    className="w-5 h-5 text-[#6B665C]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    />
                  </svg>
                </div>

                <p className="text-xs font-medium text-[#1F1D1A]">
                  <span className="underline underline-offset-2">Click to browse</span> or drag and drop image file
                </p>
                <p className="text-[11px] text-[#6B665C] mt-1">
                  Field photos, aerial photography, or thermal/rescue frames
                </p>
              </div>
            </div>

            {/* Error Display */}
            {fileError ? (
              <div className="mt-3">
                <StatusLine
                  status="error"
                  message={fileError}
                  code="VALIDATION_FAILED"
                />
              </div>
            ) : null}

            {/* Staged File Status */}
            {selectedFile ? (
              <div className="mt-4 p-3 rounded-md bg-[#FAF8F4] border border-[#E5E1D8] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B6B3A]" />
                    <span className="text-xs font-semibold text-[#1F1D1A] truncate">
                      {selectedFile.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6B665C] mt-0.5 font-mono">
                    {(selectedFile.size / 1024).toFixed(1)} KB &bull; {selectedFile.type}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    Clear
                  </Button>
                  <Button variant="primary" size="sm">
                    Execute Analysis
                  </Button>
                </div>
              </div>
            ) : null}
          </Panel>

          {/* Honest Evidentiary Split: Observed vs Interpreted */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Panel
              title="Observed (Code Evidence)"
              subtitle="Deterministic metrics extracted directly from pixel space"
            >
              <div className="space-y-2 text-xs text-[#6B665C]">
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F1D1A] mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-[#1F1D1A]">YOLO Person Detection:</strong> Evaluates image bounding boxes exclusively for COCO class index 0.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F1D1A] mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-[#1F1D1A]">Spatial Dispersion:</strong> Computes subject density, centroid, and bounding box area fractions.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F1D1A] mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-[#1F1D1A]">Quadrant Profiling:</strong> Maps subject distribution across image frames.
                  </span>
                </div>
              </div>
            </Panel>

            <Panel
              title="Interpreted (AI Reasoning)"
              subtitle="Structured analysis generated by Groq (openai/gpt-oss-120b)"
            >
              <div className="space-y-2 text-xs text-[#6B665C]">
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F1D1A] mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-[#1F1D1A]">Zero Pixel Ingestion:</strong> The LLM consumes only structured geometric and numerical evidence.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F1D1A] mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-[#1F1D1A]">Schema Validation:</strong> Adheres to strict Pydantic assessment models without hallucinated fields.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F1D1A] mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-[#1F1D1A]">Triage Assessment:</strong> Assigns standardized urgency levels, rationales, and dispatch alerts.
                  </span>
                </div>
              </div>
            </Panel>
          </div>
        </div>

        {/* Right Column: Processing Protocol & Technical Scope (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Panel title="Pipeline Protocol" subtitle="How evidence flows through ResQVision">
            <ol className="relative border-l border-[#E5E1D8] ml-2 space-y-4 py-1 text-xs text-[#6B665C]">
              <li className="ml-4">
                <span className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full border border-[#E5E1D8] bg-[#FAF8F4]" />
                <h3 className="font-semibold text-[#1F1D1A]">1. Vision Inference</h3>
                <p className="mt-0.5 leading-normal">
                  YOLO Nano model scans the image file for human subjects and outputs normalized bounding coordinates.
                </p>
              </li>

              <li className="ml-4">
                <span className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full border border-[#E5E1D8] bg-[#FAF8F4]" />
                <h3 className="font-semibold text-[#1F1D1A]">2. Deterministic Telemetry</h3>
                <p className="mt-0.5 leading-normal">
                  Mathematical routines calculate spread scores, quadrant counts, and aspect-ratio posture indicators.
                </p>
              </li>

              <li className="ml-4">
                <span className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full border border-[#E5E1D8] bg-[#FAF8F4]" />
                <h3 className="font-semibold text-[#1F1D1A]">3. Evidentiary Synthesis</h3>
                <p className="mt-0.5 leading-normal">
                  Groq API synthesizes the numerical metrics into urgency prioritization and resource requirements.
                </p>
              </li>

              <li className="ml-4">
                <span className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full border border-[#E5E1D8] bg-[#FAF8F4]" />
                <h3 className="font-semibold text-[#1F1D1A]">4. Audit Record</h3>
                <p className="mt-0.5 leading-normal">
                  The complete incident record is stored in local file persistence for post-incident review.
                </p>
              </li>
            </ol>
          </Panel>

          <Panel
            title="Integrity & Constraints"
            subtitle="Operational guarantees for search & rescue personnel"
          >
            <div className="space-y-3 text-xs text-[#6B665C]">
              <div className="p-2.5 rounded bg-[#FAF8F4] border border-[#E5E1D8]">
                <span className="font-semibold text-[#1F1D1A] block">
                  Location Independence Notice
                </span>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  2D bounding boxes represent visual pixel coordinates inside the uploaded image. Image detection does <strong>not</strong> establish geographic GPS position.
                </p>
              </div>

              <div className="p-2.5 rounded bg-[#FAF8F4] border border-[#E5E1D8]">
                <span className="font-semibold text-[#1F1D1A] block">
                  Data Privacy Standard
                </span>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  Raw photographic pixels are never transmitted to external LLM providers. Only mathematical evidence structures leave the local runtime.
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
