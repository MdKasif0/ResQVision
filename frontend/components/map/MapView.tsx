"use client";

import React, { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_TILE_URL,
  MAP_ATTRIBUTION,
  getSeverityColor,
  PIN_MARKER_COLOR,
} from "@/lib/mapConfig";

export interface MapIncidentItem {
  id: string;
  created_at: string;
  severity: string;
  person_count: number;
  location_label?: string | null;
  latitude: number;
  longitude: number;
  summary?: string | null;
}

export interface MapViewProps {
  className?: string;
  style?: React.CSSProperties;
  height?: string | number;
  // Mode 1: Interactive Pinning
  interactivePin?: boolean;
  pinnedLocation?: { lat: number; lng: number } | null;
  onPinChange?: (location: { lat: number; lng: number } | null) => void;
  // Mode 2: Multi-incident viewer
  incidents?: MapIncidentItem[];
  selectedIncidentId?: string | null;
  onSelectIncident?: (id: string) => void;
  // External flyTo trigger
  flyToLocation?: { lat: number; lng: number; zoom?: number } | null;
  // Viewport configuration overrides
  initialCenter?: [number, number]; // [lng, lat]
  initialZoom?: number;
  tileUrl?: string;
  attribution?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(iso: string): string {
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
}

export default function MapView({
  className = "",
  style,
  height = "380px",
  interactivePin = false,
  pinnedLocation = null,
  onPinChange,
  incidents = [],
  selectedIncidentId = null,
  onSelectIncident,
  flyToLocation,
  initialCenter = DEFAULT_MAP_CENTER,
  initialZoom = DEFAULT_MAP_ZOOM,
  tileUrl = MAP_TILE_URL,
  attribution = MAP_ATTRIBUTION,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const pinMarkerRef = useRef<maplibregl.Marker | null>(null);
  const incidentMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const popupsRef = useRef<Map<string, maplibregl.Popup>>(new Map());

  const [mapLoaded, setMapLoaded] = useState(false);
  const [tileUnavailable, setTileUnavailable] = useState(false);

  // Initialize MapLibre instance once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Reset tile unavailable state on fresh initialization
    setTileUnavailable(false);

    // Raster OpenStreetMap tile source specification
    const rasterStyle: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        "osm-tiles": {
          type: "raster",
          tiles: [tileUrl],
          tileSize: 256,
          attribution: attribution,
          maxzoom: 19,
        },
      },
      layers: [
        {
          id: "osm-layer",
          type: "raster",
          source: "osm-tiles",
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    };

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: rasterStyle,
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: false, // We add custom configured attribution control
    });

    // Custom attribution control with clear attribution
    map.addControl(
      new maplibregl.AttributionControl({
        compact: false,
        customAttribution: attribution,
      }),
      "bottom-right"
    );

    // Add navigation controls (zoom in / out)
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right"
    );

    map.on("load", () => {
      setMapLoaded(true);
    });

    // Honest tile failure detection
    map.on("error", (e: { error?: { message?: string }; sourceId?: string }) => {
      // Check if the error originates from tile loading or source network failure
      const errorMsg = String(e.error?.message || e.error || "");
      if (
        e.sourceId === "osm-tiles" ||
        /tile|source|404|fetch|network|cors|offline/i.test(errorMsg)
      ) {
        setTileUnavailable(true);
      }
    });

    // Detect browser offline event
    const handleOffline = () => setTileUnavailable(true);
    window.addEventListener("offline", handleOffline);

    mapRef.current = map;

    return () => {
      window.removeEventListener("offline", handleOffline);
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, [tileUrl, attribution]);

  // Handle map click for pinning location
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !interactivePin) return;

    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      const lat = e.lngLat.lat;
      const lng = e.lngLat.lng;

      // Validate bounds [-90, 90] and [-180, 180]
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        if (onPinChange) {
          onPinChange({
            lat: Number(lat.toFixed(6)),
            lng: Number(lng.toFixed(6)),
          });
        }
      }
    };

    map.on("click", handleMapClick);

    // Set cursor to crosshair for pinning mode
    map.getCanvas().style.cursor = "crosshair";

    return () => {
      map.off("click", handleMapClick);
      if (map.getCanvas()) {
        map.getCanvas().style.cursor = "";
      }
    };
  }, [interactivePin, onPinChange]);

  // Update Pin Marker when pinnedLocation changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!pinnedLocation) {
      if (pinMarkerRef.current) {
        pinMarkerRef.current.remove();
        pinMarkerRef.current = null;
      }
      return;
    }

    const { lat, lng } = pinnedLocation;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

    if (!pinMarkerRef.current) {
      // Create custom pin element matching design system (charcoal + ivory)
      const el = document.createElement("div");
      el.className = "resq-custom-pin-marker";
      el.setAttribute("role", "status");
      el.setAttribute("aria-label", "User pinned location");
      el.innerHTML = `
        <div style="
          position: relative;
          width: 32px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 3px 6px rgba(31, 29, 26, 0.35));
          cursor: pointer;
        ">
          <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.163 0 0 7.163 0 16C0 28 16 40 16 40C16 40 32 28 32 16C32 7.163 24.837 0 16 0Z" fill="${PIN_MARKER_COLOR}"/>
            <path d="M16 1.5C8 1.5 1.5 8 1.5 16C1.5 26.5 14.5 37.8 16 38.8C17.5 37.8 30.5 26.5 30.5 16C30.5 8 24 1.5 16 1.5Z" stroke="#FAF8F4" stroke-width="2"/>
            <circle cx="16" cy="15" r="5" fill="#FAF8F4"/>
          </svg>
        </div>
      `;

      const marker = new maplibregl.Marker({
        element: el,
        anchor: "bottom",
      })
        .setLngLat([lng, lat])
        .addTo(map);

      pinMarkerRef.current = marker;
    } else {
      pinMarkerRef.current.setLngLat([lng, lat]);
    }
  }, [pinnedLocation, mapLoaded]);

  // Update Incident Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Filter incidents with valid numeric coordinates
    const validIncidents = incidents.filter(
      (inc) =>
        typeof inc.latitude === "number" &&
        typeof inc.longitude === "number" &&
        !isNaN(inc.latitude) &&
        !isNaN(inc.longitude) &&
        inc.latitude >= -90 &&
        inc.latitude <= 90 &&
        inc.longitude >= -180 &&
        inc.longitude <= 180
    );

    const currentIds = new Set(validIncidents.map((i) => i.id));

    // Remove markers that no longer exist
    incidentMarkersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        incidentMarkersRef.current.delete(id);
        popupsRef.current.delete(id);
      }
    });

    // Create or update markers
    validIncidents.forEach((inc) => {
      const isSelected = selectedIncidentId === inc.id;
      const color = getSeverityColor(inc.severity);

      let marker = incidentMarkersRef.current.get(inc.id);

      if (!marker) {
        const el = document.createElement("div");
        el.className = "resq-incident-marker";
        el.setAttribute("role", "button");
        el.setAttribute("tabindex", "0");
        el.setAttribute(
          "aria-label",
          `Incident ${inc.id.slice(0, 6)}: ${inc.severity} priority, ${inc.person_count} persons detected`
        );

        el.innerHTML = `
          <div style="
            position: relative;
            width: 28px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            filter: drop-shadow(0 2px 5px rgba(31, 29, 26, 0.3));
            transition: transform 0.15s ease;
          ">
            <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="${color}"/>
              <path d="M14 1.2C6.9 1.2 1.2 6.9 1.2 14C1.2 23.5 13.5 34.2 14 34.7C14.5 34.2 26.8 23.5 26.8 14C26.8 6.9 21.1 1.2 14 1.2Z" stroke="#FAF8F4" stroke-width="1.8"/>
              <circle cx="14" cy="14" r="5.5" fill="#FAF8F4"/>
              <circle cx="14" cy="14" r="3" fill="${color}"/>
            </svg>
          </div>
        `;

        // Create popup with design-system styling
        const popup = new maplibregl.Popup({
          offset: [0, -32],
          closeButton: true,
          closeOnClick: false,
          className: "resq-map-popup",
          maxWidth: "300px",
        }).setHTML(`
          <div style="font-family: inherit; font-size: 11px; line-height: 1.4; color: #1F1D1A; padding: 2px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
              <span style="
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 2px 6px;
                border-radius: 4px;
                background: #FAF8F4;
                border: 1px solid ${color}40;
                color: ${color};
                font-weight: 600;
                font-size: 10px;
                text-transform: uppercase;
              ">
                <span style="width: 5px; height: 5px; border-radius: 50%; background: ${color};"></span>
                ${escapeHtml(inc.severity)}
              </span>
              <span style="font-size: 10px; color: #6B665C; font-family: monospace;">
                ${escapeHtml(formatDate(inc.created_at))}
              </span>
            </div>

            <div style="margin-bottom: 6px;">
              <div style="font-weight: 600; font-size: 12px; color: #1F1D1A; margin-bottom: 2px;">
                ${inc.location_label ? escapeHtml(inc.location_label) : "Unlabeled Site"}
              </div>
              <div style="display: flex; align-items: center; gap: 6px; font-size: 10px; color: #6B665C;">
                <span style="font-family: monospace;">${inc.latitude.toFixed(4)}, ${inc.longitude.toFixed(4)}</span>
                <span style="background: #FFFFFF; border: 1px solid #E5E1D8; padding: 1px 4px; border-radius: 3px; font-size: 9px; text-transform: uppercase;">
                  Location entered by user
                </span>
              </div>
            </div>

            <div style="font-size: 11px; color: #6B665C; margin-bottom: 6px;">
              Persons detected: <strong style="color: #1F1D1A;">${inc.person_count}</strong>
            </div>

            ${
              inc.summary
                ? `
              <div style="
                margin-bottom: 8px;
                padding: 6px;
                background: #FFFFFF;
                border: 1px solid #E5E1D8;
                border-radius: 4px;
                font-size: 10px;
                color: #1F1D1A;
                max-height: 55px;
                overflow-y: auto;
              ">
                ${escapeHtml(inc.summary)}
              </div>
            `
                : ""
            }

            <div style="text-align: right; border-top: 1px solid #E5E1D8; padding-top: 6px;">
              <a href="/incidents/${encodeURIComponent(inc.id)}" style="
                display: inline-block;
                font-size: 11px;
                font-weight: 600;
                color: #1F1D1A;
                text-decoration: underline;
              ">
                Inspect Incident &rarr;
              </a>
            </div>
          </div>
        `);

        // Click on marker
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          if (onSelectIncident) {
            onSelectIncident(inc.id);
          }
          popup.addTo(map);
        });

        // Keyboard accessibility
        el.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            if (onSelectIncident) {
              onSelectIncident(inc.id);
            }
            popup.addTo(map);
          }
        });

        marker = new maplibregl.Marker({
          element: el,
          anchor: "bottom",
        })
          .setLngLat([inc.longitude, inc.latitude])
          .setPopup(popup)
          .addTo(map);

        incidentMarkersRef.current.set(inc.id, marker);
        popupsRef.current.set(inc.id, popup);
      } else {
        marker.setLngLat([inc.longitude, inc.latitude]);
      }

      // Update selection styling
      const markerEl = marker.getElement();
      if (markerEl) {
        const svgWrapper = markerEl.firstElementChild as HTMLElement;
        if (svgWrapper) {
          if (isSelected) {
            svgWrapper.style.transform = "scale(1.25)";
            svgWrapper.style.filter = "drop-shadow(0 0 8px rgba(31, 29, 26, 0.6))";
          } else {
            svgWrapper.style.transform = "scale(1)";
            svgWrapper.style.filter = "drop-shadow(0 2px 5px rgba(31, 29, 26, 0.3))";
          }
        }
      }
    });
  }, [incidents, selectedIncidentId, onSelectIncident, mapLoaded]);

  // Handle external flyToLocation
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyToLocation) return;

    map.flyTo({
      center: [flyToLocation.lng, flyToLocation.lat],
      zoom: flyToLocation.zoom || 14,
      speed: 1.2,
      curve: 1.42,
      essential: true,
    });
  }, [flyToLocation]);

  // Open popup when selectedIncidentId changes externally
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedIncidentId) return;

    const popup = popupsRef.current.get(selectedIncidentId);
    const marker = incidentMarkersRef.current.get(selectedIncidentId);
    if (popup && marker) {
      if (!popup.isOpen()) {
        popup.addTo(map);
      }
    }
  }, [selectedIncidentId]);

  return (
    <div
      className={`relative w-full rounded-md overflow-hidden bg-[#FAF8F4] border border-[#E5E1D8] ${className}`}
      style={{ height, ...style }}
    >
      {/* MapLibre DOM container */}
      <div ref={mapContainerRef} className="w-full h-full" tabIndex={0} />

      {/* Honest tile-failure notice */}
      {tileUnavailable && (
        <div
          role="status"
          aria-live="polite"
          className="absolute top-2 left-2 z-20 px-3 py-1.5 rounded-md bg-[#FAF0EE] border border-[#E8C4BE] text-[#B5483A] text-xs font-medium flex items-center gap-2 shadow-subtle pointer-events-auto"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#B5483A] shrink-0" />
          <span>Map tiles unavailable</span>
          <span className="text-[10px] text-[#6B665C] font-normal hidden sm:inline">
            &bull; User-entered locations and markers remain fully functional
          </span>
        </div>
      )}

      {/* Pinning Helper Hint in Pin Mode */}
      {interactivePin && (
        <div className="absolute bottom-2 left-2 z-10 px-2.5 py-1 rounded bg-[#FFFFFF]/90 backdrop-blur-sm border border-[#E5E1D8] text-[10px] text-[#6B665C] shadow-subtle pointer-events-none">
          Click map to pin incident location
        </div>
      )}
    </div>
  );
}
