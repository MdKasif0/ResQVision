/**
 * ResQVision Map Configuration & Constants
 *
 * Configurable constants for MapLibre GL JS map instance.
 * Default coordinates represent Chandigarh University, Mohali, India
 * used purely as a neutral viewport default, NOT as incident data.
 */

export interface MapCoordinates {
  latitude: number;
  longitude: number;
}

// Default viewport coordinates (Mohali / Chandigarh University region, India)
// In MapLibre GL JS, coordinates are [longitude, latitude]
export const DEFAULT_MAP_CENTER: [number, number] = [76.5754, 30.7688];
export const DEFAULT_MAP_ZOOM = 12;

// OpenStreetMap raster tile server
export const MAP_TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ||
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

// Severity color palette matching the ResQVision design system
// Charcoal text, ivory surface, muted severity accents (no blue/purple)
export const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#B5483A", // muted crimson
  HIGH: "#B5483A",
  MODERATE: "#B7791F", // amber
  MEDIUM: "#B7791F",
  LOW: "#5B6B3A", // olive sage
  UNKNOWN: "#8A857A", // stone gray
  INDETERMINATE: "#8A857A",
};

export const PIN_MARKER_COLOR = "#1F1D1A"; // ResQVision charcoal

export function getSeverityColor(severity?: string | null): string {
  if (!severity) return SEVERITY_COLORS.UNKNOWN;
  const upper = severity.toUpperCase();
  return SEVERITY_COLORS[upper] || SEVERITY_COLORS.UNKNOWN;
}
