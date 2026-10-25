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

interface RenderLayout {
  elemWidth: number;
  elemHeight: number;
  drawnWidth: number;
  drawnHeight: number;
  offsetX: number;
  offsetY: number;
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
  const [layout, setLayout] = useState<RenderLayout>({
    elemWidth: 0,
    elemHeight: 0,
    drawnWidth: 0,
    drawnHeight: 0,
    offsetX: 0,
    offsetY: 0,
  });
  const [showLabels, setShowLabels] = useState(true);

  // Measure rendered image element dimensions and compute letterboxed/drawn image rect
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const updateDimensions = () => {
      if (!imgRef.current) return;
      const rect = imgRef.current.getBoundingClientRect();
      const elemWidth = rect.width;
      const elemHeight = rect.height;
      if (elemWidth <= 0 || elemHeight <= 0) return;

      const naturalW = imgRef.current.naturalWidth || 1;
      const naturalH = imgRef.current.naturalHeight || 1;
      const origW = originalWidth > 0 ? originalWidth : naturalW;
      const origH = originalHeight > 0 ? originalHeight : naturalH;

      // Uniform scale under object-fit: contain
      const scale = Math.min(elemWidth / origW, elemHeight / origH);
      const drawnWidth = origW * scale;
      const drawnHeight = origH * scale;
      const offsetX = (elemWidth - drawnWidth) / 2;
      const offsetY = (elemHeight - drawnHeight) / 2;

      setLayout({
        elemWidth,
        elemHeight,
        drawnWidth,
        drawnHeight,
        offsetX,
        offsetY,
      });
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(el);
    window.addEventListener("resize", updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, [imageUrl, originalWidth, originalHeight]);

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
              const rect = imgRef.current.getBoundingClientRect();
              const elemWidth = rect.width;
              const elemHeight = rect.height;
              if (elemWidth > 0 && elemHeight > 0) {
                const naturalW = imgRef.current.naturalWidth || 1;
                const naturalH = imgRef.current.naturalHeight || 1;
                const origW = originalWidth > 0 ? originalWidth : naturalW;
                const origH = originalHeight > 0 ? originalHeight : naturalH;
                const scale = Math.min(elemWidth / origW, elemHeight / origH);
                const drawnWidth = origW * scale;
                const drawnHeight = origH * scale;
                setLayout({
                  elemWidth,
                  elemHeight,
                  drawnWidth,
                  drawnHeight,
                  offsetX: (elemWidth - drawnWidth) / 2,
                  offsetY: (elemHeight - drawnHeight) / 2,
                });
              }
            }
          }}
          className="w-full h-auto block max-h-[580px] object-contain"
        />

        {/* SVG Coordinate Bounding Box Overlay with letterboxing support */}
        {layout.elemWidth > 0 && layout.elemHeight > 0 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${layout.elemWidth} ${layout.elemHeight}`}
            preserveAspectRatio="none"
          >
            {detections.map((det) => {
              const origW = originalWidth > 0 ? originalWidth : (layout.drawnWidth || 1);
              const origH = originalHeight > 0 ? originalHeight : (layout.drawnHeight || 1);

              const nx1 = det.bbox_normalized
                ? det.bbox_normalized[0]
                : origW > 0
                ? det.bbox_xyxy[0] / origW
                : 0;
              const ny1 = det.bbox_normalized
                ? det.bbox_normalized[1]
                : origH > 0
                ? det.bbox_xyxy[1] / origH
                : 0;
              const nx2 = det.bbox_normalized
                ? det.bbox_normalized[2]
                : origW > 0
                ? det.bbox_xyxy[2] / origW
                : 1;
              const ny2 = det.bbox_normalized
                ? det.bbox_normalized[3]
                : origH > 0
                ? det.bbox_xyxy[3] / origH
                : 1;

              const boxX = layout.offsetX + nx1 * layout.drawnWidth;
              const boxY = layout.offsetY + ny1 * layout.drawnHeight;
              const boxW = Math.max(2, (nx2 - nx1) * layout.drawnWidth);
              const boxH = Math.max(2, (ny2 - ny1) * layout.drawnHeight);

              const isHoriz = isCandidate(det.id);
              const isSelected = selectedId === det.id;
              const isHovered = hoveredId === det.id;
              const isActive = isSelected || isHovered;

              // Distinct styles for standard vs horizontal candidates (No blue/purple)
              // Active: Terracotta (#B5483A)
              // Horizontal: Amber/Ochre (#B7791F) with dashed border
              // Standard: Olive Green (#5B6B3A)
              let strokeColor = isHoriz ? "#B7791F" : "#5B6B3A";
              let fillColor = isHoriz ? "rgba(183, 121, 31, 0.14)" : "rgba(91, 107, 58, 0.09)";
              let strokeWidth = isHoriz ? 2.5 : 2;
              let strokeDash = isHoriz ? "4 2" : "none";

              if (isActive) {
                strokeColor = "#B5483A";
                fillColor = "rgba(181, 72, 58, 0.24)";
                strokeWidth = 3;
                strokeDash = "none";
              }

              const tagWidth = isHoriz ? 95 : 72;
              const tagX = Math.max(
                layout.offsetX,
                Math.min(boxX, layout.offsetX + layout.drawnWidth - tagWidth)
              );
              const tagAbove = boxY - layout.offsetY > 20;
              const tagY = tagAbove ? boxY - 18 : boxY + 2;
              const textY = tagAbove ? boxY - 6 : boxY + 14;

              const tagText = `${det.id} (${Math.round(det.confidence * 100)}%)${
                isHoriz ? " [Prone]" : ""
              }`;

              return (
                <g
                  key={det.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Person detection ${det.id}, confidence ${Math.round(det.confidence * 100)}%, aspect ratio ${det.aspect_ratio.toFixed(2)}${isHoriz ? ', prone posture candidate' : ''}, area ${(det.area_fraction * 100).toFixed(1)}%`}
                  aria-pressed={isSelected}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectDetection?.(isSelected ? null : det.id);
                    }
                  }}
                  className="pointer-events-auto cursor-pointer transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B5483A]"
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
                        x={tagX}
                        y={tagY}
                        width={Math.min(boxW > 30 ? boxW : tagWidth, tagWidth)}
                        height={16}
                        fill={strokeColor}
                        rx={2}
                      />
                      <text
                        x={tagX + 4}
                        y={textY}
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
