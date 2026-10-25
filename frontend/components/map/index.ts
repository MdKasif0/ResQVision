import dynamic from "next/dynamic";
import React from "react";
import type { MapViewProps } from "./MapView";

// Client-only dynamic export with ssr: false
export const MapView = dynamic<MapViewProps>(() => import("./MapView"), {
  ssr: false,
  loading: () =>
    React.createElement(
      "div",
      {
        className:
          "w-full h-[320px] rounded-md bg-[#FAF8F4] border border-[#E5E1D8] flex flex-col items-center justify-center gap-2 text-xs text-[#6B665C]",
      },
      React.createElement("div", {
        className:
          "w-5 h-5 border-2 border-[#1F1D1A]/20 border-t-[#1F1D1A] rounded-full animate-spin",
      }),
      React.createElement("span", null, "Initializing Map View...")
    ),
});

export type { MapViewProps, MapIncidentItem } from "./MapView";
