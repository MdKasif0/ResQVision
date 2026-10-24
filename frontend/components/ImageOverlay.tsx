"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Detection } from "../lib/types";

interface ImageOverlayProps {
  imageUrl: string;
  originalWidth: number;
  originalHeight: number;
  detections: Detection[];
  horizontalCandidates?: string[];
  selectedId?: string | null;
  hoveredId?: string | null;
  onSelectDetection?: (id: string | null) => void;
  onHoverDetection?: (id: string | null) => void;
  className?: string;
}

export function ImageOverlay({
  imageUrl,
  originalWidth,
  originalHeight,
  detections,
  horizontalCandidates = [],
  selectedId = null,
  hoveredId = null,
  onSelectDetection,
  onHoverDetection,
  className = "",
}: ImageOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [renderedDim, setRenderedDim] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [showLabels, setShowLabels] = useState(true);

  // Measure rendered image dimensions accurately using ResizeObserver
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const updateDimensions = () => {
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setRenderedDim({
            width: rect.width,
            height: rect.height,
          });
        }
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [imageUrl, originalWidth, originalHeight]);

  const scaleX =
    originalWidth > 0 && renderedDim.width > 0
      ? renderedDim.width / originalWidth
      : 1;
  const scaleY =
    originalHeight > 0 && renderedDim.height > 0
      ? renderedDim.height / originalHeight
      : 1;

  const isCandidate = (id: string) => horizontalCandidates.includes(id);

  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      {/* Image & SVG Overlay Container */}
      <div
        ref={containerRef}
        className="relative w-full rounded-md overflow-hidden bg-[#1F1D1A] border border-[#E5E1D8] shadow-subtle select-none flex items-center justify-center"
      >
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Visual incident capture"
          onLoad={() => {
            if (imgRef.current) {
              const r = imgRef.current.getBoundingClientRect();
              setRenderedDim({ width: r.width, height: r.height });
            }
          }}
          className="w-full h-auto block max-h-[580px] object-contain"
        />

        {/* SVG Coordinate Bounding Box Overlay */}
        {renderedDim.width > 0 && renderedDim.height > 0 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${renderedDim.width} ${renderedDim.height}`}
            preserveAspectRatio="none"
          >
            {detections.map((det) => {
              const [x1, y1, x2, y2] = det.bbox_xyxy;
              const boxX = x1 * scaleX;
              const boxY = y1 * scaleY;
              const boxW = Math.max(2, (x2 - x1) * scaleX);
              const boxH = Math.max(2, (y2 - y1) * scaleY);

              const isHoriz = isCandidate(det.id);
              const isSelected = selectedId === det.id;
              const isHovered = hoveredId === det.id;
              const isActive = isSelected || isHovered;

              // Distinct styles for standard vs horizontal candidates (No blue/purple)
              // Active: Terracotta (#B5483A)
              // Horizontal: Amber/Ochre (#B7791F) with dashed border
              // Standard: Olive Green (#5B6B3A) or Charcoal (#1F1D1A)
              let strokeColor = isHoriz ? "#B7791F" : "#5B6B3A";
              let fillColor = isHoriz ? "rgba(183, 121, 31, 0.12)" : "rgba(91, 107, 58, 0.08)";
              let strokeWidth = isHoriz ? 2.5 : 2;
              let strokeDash = isHoriz ? "4 2" : "none";

              if (isActive) {
                strokeColor = "#B5483A";
                fillColor = "rgba(181, 72, 58, 0.22)";
                strokeWidth = 3;
                strokeDash = "none";
              }

              const tagY = Math.max(16, boxY - 4);
              const tagText = `${det.id} (${Math.round(det.confidence * 100)}%)${
                isHoriz ? " [Prone]" : ""
              }`;

              return (
                <g
                  key={det.id}
                  className="pointer-events-auto cursor-pointer transition-opacity"
                  onClick={() =>
                    onSelectDetection?.(isSelected ? null : det.id)
                  }
                  onMouseEnter={() => onHoverDetection?.(det.id)}
                  onMouseLeave={() => onHoverDetection?.(null)}
                >
                  {/* Outer contrast halo for visibility against dark/light pixels */}
                  <rect
                    x={boxX - 1}
                    y={boxY - 1}
                    width={boxW + 2}
                    height={boxH + 2}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={1}
                    opacity={0.65}
                  />

                  {/* Primary Bounding Box */}
                  <rect
                    x={boxX}
                    y={boxY}
                    width={boxW}
                    height={boxH}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDash}
                    rx={2}
                  />

                  {/* Identification & Confidence Tag */}
                  {showLabels && (
                    <g>
                      <rect
                        x={boxX}
                        y={boxY > 20 ? boxY - 18 : boxY + 2}
                        width={Math.min(boxW, isHoriz ? 95 : 72)}
                        height={16}
                        fill={strokeColor}
                        rx={2}
                      />
                      <text
                        x={boxX + 4}
                        y={boxY > 20 ? boxY - 6 : boxY + 14}
                        fill="#FFFFFF"
                        fontSize="10"
                        fontWeight="600"
                        fontFamily="monospace"
                        className="select-none pointer-events-none"
                      >
                        {tagText}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Visual Bounding Box Legend & Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#6B665C] px-1">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-[2px] border-2 border-[#5B6B3A] bg-[#5B6B3A]/10"
              aria-hidden="true"
            />
            <span>Upright Subject</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-[2px] border-2 border-dashed border-[#B7791F] bg-[#B7791F]/15"
              aria-hidden="true"
            />
            <span>Horizontal Candidate (w/h &ge; 1.2)</span>
          </div>

          {selectedId && (
            <div className="flex items-center gap-1.5 font-medium text-[#B5483A]">
              <span
                className="w-3 h-3 rounded-[2px] border-2 border-[#B5483A] bg-[#B5483A]/25"
                aria-hidden="true"
              />
              <span>Selected ({selectedId})</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowLabels(!showLabels)}
          className="text-[11px] text-[#6B665C] hover:text-[#1F1D1A] underline underline-offset-2 transition-colors focus:outline-none"
        >
          {showLabels ? "Hide Tags" : "Show Tags"}
        </button>
      </div>
    </div>
  );
}
