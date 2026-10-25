"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

// Reusable Illustrative Example Badge
function IllustrativeBadge({
  label = "Illustrative example",
  variant = "default",
}: {
  label?: string;
  variant?: "default" | "teal" | "amber";
}) {
  const colorStyles =
    variant === "teal"
      ? "bg-[#38E1FF]/10 text-[#38E1FF] border-[#38E1FF]/30"
      : variant === "amber"
      ? "bg-[#FBAA24]/10 text-[#FBAA24] border-[#FBAA24]/30"
      : "bg-white/5 text-neutral-400 border-white/10";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border backdrop-blur-sm select-none ${colorStyles}`}
      aria-label={`${label} disclaimer`}
    >
      <svg
        className="w-3 h-3 shrink-0 opacity-80"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0-1A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM7.25 7h1.5v4.5h-1.5V7zm0-2.5h1.5v1.5h-1.5V4.5z" />
      </svg>
      <span>{label}</span>
    </span>
  );
}

// Brand Logo Mark (SVG)
function LogoMark({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M6 24.5C8.8 20.2 13.5 17.5 18.8 17.5C24.2 17.5 28.5 20.8 30.8 24.5C27.5 21 22.8 19.5 18 20.5C13.2 21.5 9.5 24.2 6 24.5Z"
        fill="#FF5751"
      />
      <path
        d="M7 14C10.5 8.5 17.2 6.5 23.5 7.8C27.8 8.8 30.5 11.5 31.5 14.5C28.2 11.5 23.8 10.5 19 11.8C14.2 13.1 10.5 17.2 7 14Z"
        fill="#FF5751"
      />
      <path
        d="M13.5 19.2C15.8 16.5 19.5 15.2 23.5 15.8C27.5 16.5 30.2 19 32 21.8C29.2 19.5 25.8 18.5 22 19.2C18.2 20 15.5 22.5 13.5 19.2Z"
        fill="#FF8863"
      />
    </svg>
  );
}

// Disaster Scene Mock Graphic (Simulated Rubble & Detection Canvas)
function RubbleSceneVisual({
  detections = [
    { label: "Person 0.87", x: "28%", y: "42%", w: "12%", h: "28%" },
    { label: "Person 0.82", x: "68%", y: "40%", w: "11%", h: "26%" },
    { label: "Person 0.79", x: "48%", y: "54%", w: "12%", h: "27%" },
  ],
  aspect = "aspect-[16/9]",
  showOverlayText = false,
  overlayText = "Visual evidence begins with the supplied image.",
}: {
  detections?: Array<{ label: string; x: string; y: string; w: string; h: string }>;
  aspect?: string;
  showOverlayText?: boolean;
  overlayText?: string;
}) {
  return (
    <div
      className={`relative w-full ${aspect} bg-[#0A141F] rounded-lg overflow-hidden border border-white/10 select-none group`}
      aria-hidden="true"
    >
      {/* Cinematic simulated aerial disaster landscape */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0c1b26] via-[#102230] to-[#08121a]">
        {/* Abstract topographic and rubble textures */}
        <svg
          className="absolute inset-0 w-full h-full opacity-35 object-cover"
          xmlns="http://www.w3.org/2000/svg"
        >
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" />
            <feColorMatrix type="saturate" values="0.1" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" opacity="0.6" />
        </svg>

        {/* Structural debris geometry lines */}
        <svg
          className="absolute inset-0 w-full h-full opacity-25"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 800 450"
        >
          <path
            d="M50 380 L180 260 L320 310 L440 220 L580 340 L750 280"
            stroke="#475569"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            fill="none"
          />
          <path
            d="M120 420 L240 330 L380 390 L520 290 L680 380"
            stroke="#334155"
            strokeWidth="1.5"
            fill="none"
          />
          <polygon
            points="140,240 220,180 310,230 250,290"
            fill="#1e293b"
            opacity="0.4"
            stroke="#475569"
            strokeWidth="0.8"
          />
          <polygon
            points="460,200 560,160 620,230 540,270"
            fill="#1e293b"
            opacity="0.5"
            stroke="#475569"
            strokeWidth="0.8"
          />
        </svg>
      </div>

      {/* Grid overlay for tactical radar / vision feel */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"
        aria-hidden="true"
      />

      {/* Detected Bounding Boxes */}
      {detections.map((box, idx) => (
        <div
          key={idx}
          className="absolute border border-[#FF5751] bg-[#FF5751]/10 rounded-[2px] transition-all"
          style={{
            left: box.x,
            top: box.y,
            width: box.w,
            height: box.h,
          }}
        >
          {/* Label Tag */}
          <div className="absolute -top-5 left-0 bg-[#FF5751] text-white font-mono text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-xs tracking-tight whitespace-nowrap shadow-md">
            {box.label}
          </div>
          {/* Corner brackets */}
          <span className="absolute -top-[1px] -left-[1px] w-1.5 h-1.5 border-t border-l border-white" />
          <span className="absolute -bottom-[1px] -right-[1px] w-1.5 h-1.5 border-b border-r border-white" />
        </div>
      ))}

      {/* Optional bottom overlay text */}
      {showOverlayText && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#060C14] via-[#060C14]/80 to-transparent p-3 pt-6 flex items-center justify-between text-[11px] text-neutral-400">
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="truncate">{overlayText}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MarketingLandingPage() {
  const [activeSection, setActiveSection] = useState<string>("hero");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // IntersectionObserver to sync navigation active indicator
  useEffect(() => {
    const sectionIds = ["hero", "product", "how-it-works", "technology", "about"];
    const observers: IntersectionObserver[] = [];

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersect, {
      root: null,
      rootMargin: "-25% 0px -50% 0px",
      threshold: 0.1,
    });

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const navLinks = [
    { label: "Product", href: "#product", id: "product" },
    { label: "How It Works", href: "#how-it-works", id: "how-it-works" },
    { label: "Technology", href: "#technology", id: "technology" },
    { label: "About", href: "#about", id: "about" },
  ];

  return (
    <div className="landing-root bg-[#060C14] text-white min-h-screen selection:bg-[#FF5751]/30 selection:text-white relative overflow-x-hidden font-sans">
      {/* Accessible skip link */}
      <a
        href="#hero"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#FF5751] focus:text-white focus:rounded-md focus:text-xs font-semibold focus:outline-none"
      >
        Skip to content
      </a>

      {/* STICKY TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#060C14]/85 border-b border-white/[0.07] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand Wordmark */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group rounded-md p-1 focus-visible:outline-2 focus-visible:outline-[#FF5751] focus-visible:outline-offset-2"
          >
            <LogoMark className="w-8 h-8 transition-transform group-hover:scale-105" />
            <span className="text-lg sm:text-xl font-bold tracking-tight text-white">
              ResQVision
            </span>
          </Link>

          {/* Center Navigation Links (Desktop) */}
          <nav
            aria-label="Landing Page Navigation"
            className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium"
          >
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <a
                  key={link.id}
                  href={link.href}
                  className={`relative py-2 text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-[#FF5751] focus-visible:outline-offset-4 rounded-xs ${
                    isActive
                      ? "text-white font-semibold"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span
                      className="absolute bottom-0 inset-x-0 h-[2px] bg-[#FF5751] rounded-full transition-all duration-300"
                      aria-hidden="true"
                    />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/analyze"
              className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2 rounded-full bg-white text-black text-xs sm:text-sm font-semibold hover:bg-neutral-200 active:bg-neutral-300 transition-colors duration-150 shadow-sm focus-visible:outline-2 focus-visible:outline-[#FF5751] focus-visible:outline-offset-2"
            >
              <span>Launch ResQVision</span>
              <span aria-hidden="true">→</span>
            </Link>

            {/* Mobile Hamburger Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#FF5751]"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#060C14]/95 backdrop-blur-2xl px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium ${
                  activeSection === link.id
                    ? "bg-white/10 text-white font-semibold"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* 1. HERO SECTION (Design 1) */}
      <section
        id="hero"
        className="relative pt-10 pb-20 sm:pt-16 sm:pb-28 lg:pt-20 lg:pb-32 overflow-hidden border-b border-white/[0.06]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Hero Column */}
            <div className="lg:col-span-5 space-y-6 text-left">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2">
                <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-neutral-400">
                  AI-POWERED DISASTER INTELLIGENCE
                </span>
              </div>

              {/* H1 Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08] text-white">
                See the crisis.
                <br />
                <span className="bg-gradient-to-r from-[#FF5751] via-[#FF755E] to-[#FF8863] bg-clip-text text-transparent">
                  Understand the risk.
                </span>
              </h1>

              {/* Subcopy */}
              <p className="text-neutral-400 text-base sm:text-lg leading-relaxed max-w-lg">
                Turn disaster imagery into clear, evidence-based insights.
              </p>

              {/* CTAs */}
              <div className="pt-2 flex flex-wrap items-center gap-3.5">
                <Link
                  href="/analyze"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-black font-semibold text-sm sm:text-base hover:bg-neutral-200 active:bg-neutral-300 transition-colors shadow-lg shadow-white/5 focus-visible:outline-2 focus-visible:outline-[#FF5751]"
                >
                  <span>Launch ResQVision</span>
                  <span aria-hidden="true">→</span>
                </Link>

                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#0E1D2D]/80 hover:bg-[#132438] text-neutral-200 text-sm sm:text-base font-medium border border-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-[#FF5751]"
                >
                  <span>See How It Works</span>
                  <span className="text-xs text-neutral-400" aria-hidden="true">
                    ▶
                  </span>
                </a>
              </div>
            </div>

            {/* Right Hero Column: Aerial Map & Tactical Hazard Visuals */}
            <div className="lg:col-span-7 relative">
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#07111A] shadow-2xl shadow-black/80 aspect-[16/10] sm:aspect-[16/9]">
                {/* Background Image: Aerial Terrain */}
                <Image
                  src="/background.jpg"
                  alt="Aerial disaster mapping preview"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  className="object-cover opacity-80"
                />

                {/* Cinematic Edge Vignette & Topographic Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#060C14] via-transparent to-[#060C14]/40" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#060C14]/70 via-transparent to-[#060C14]/40" />

                {/* Simulated Wildfire Hazard Glow & Topography */}
                <div className="absolute top-[18%] right-[22%] w-44 h-36 rounded-full bg-gradient-to-br from-[#FF5751]/40 via-amber-500/20 to-transparent blur-2xl pointer-events-none" />

                {/* Vector Dotted Flight Path & Connecting Nodes */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
                  viewBox="0 0 700 400"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M 400 140 Q 480 170 510 230"
                    stroke="#FF5751"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <path
                    d="M 400 230 Q 450 260 480 300"
                    stroke="#38E1FF"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <path
                    d="M 510 170 L 540 170"
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="1"
                    strokeDasharray="2 3"
                  />
                </svg>

                {/* Hazard Marker 1: Wildfire Pin */}
                <div className="absolute top-[28%] right-[38%] flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 rounded-full bg-[#FF5751] text-white flex items-center justify-center shadow-lg shadow-[#FF5751]/50 animate-pulse">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8 6 6 9 6 12a6 6 0 0 0 12 0c0-3-2-6-6-10zm0 15a3 3 0 0 1-3-3c0-1.5 1-2.5 3-4.5 2 2 3 3 3 4.5a3 3 0 0 1-3 3z" />
                    </svg>
                  </div>
                </div>

                {/* Floating Card: WILDFIRE */}
                <div
                  className="absolute top-[18%] right-[10%] sm:right-[12%] bg-[#0A1622]/90 backdrop-blur-md border border-white/15 rounded-xl p-3 shadow-xl max-w-[210px] sm:max-w-[240px] pointer-events-none"
                  aria-hidden="true"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#FF5751] text-white flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C8 6 6 9 6 12a6 6 0 0 0 12 0c0-3-2-6-6-10zm0 15a3 3 0 0 1-3-3c0-1.5 1-2.5 3-4.5 2 2 3 3 3 4.5a3 3 0 0 1-3 3z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white tracking-wide">
                        WILDFIRE
                      </div>
                      <div className="text-[10px] text-neutral-300 truncate">
                        Area requires further assessment
                      </div>
                    </div>
                    <span className="text-neutral-400 text-xs">›</span>
                  </div>
                </div>

                {/* Hazard Marker 2: Alert Triangle Pin */}
                <div className="absolute top-[52%] left-[54%] w-6 h-6 rounded-full bg-[#FF5751]/90 text-white flex items-center justify-center shadow-md shadow-[#FF5751]/40 pointer-events-none">
                  <span className="text-xs font-bold">!</span>
                </div>

                {/* Hazard Marker 3: Water Hazard Pin */}
                <div className="absolute top-[62%] right-[28%] w-7 h-7 rounded-full bg-[#3B82F6] text-white flex items-center justify-center shadow-md shadow-[#3B82F6]/50 pointer-events-none">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M2 12c2.5-3 5-3 7.5 0s5 3 7.5 0 5-3 7-1" />
                  </svg>
                </div>

                {/* Hazard Marker 4: Landslide Triangle Pin */}
                <div className="absolute top-[48%] right-[4%] w-6 h-6 rounded-full bg-[#FBAA24] text-black flex items-center justify-center shadow-md pointer-events-none">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12 2 2 22 22 22" />
                  </svg>
                </div>

                {/* Helicopter Silhouette Icon */}
                <div className="absolute top-[38%] right-[26%] text-white opacity-85 pointer-events-none">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 8h18v1H3zm6 2h6v2H9zm-5 4h14a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3zm13 4h4v1h-4z" />
                  </svg>
                </div>

                {/* Floating Card: PERSON DETECTION (Illustrative Preview) */}
                <div
                  className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 bg-[#08141F]/95 backdrop-blur-md border border-white/15 rounded-xl p-3 shadow-2xl max-w-[240px] sm:max-w-[280px] pointer-events-none"
                  aria-hidden="true"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[11px] font-semibold">
                    <div className="flex items-center gap-1.5 text-white">
                      <span className="w-2 h-2 rounded-full bg-[#3DF0C2]" />
                      <span>PERSON DETECTION</span>
                    </div>
                    <span className="text-neutral-400 text-xs">›</span>
                  </div>

                  {/* Drone Thermal/Vision Mock Thumbnail */}
                  <div className="relative aspect-[16/10] bg-[#0A121A] rounded-md overflow-hidden border border-white/10 mb-2">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#13222e] to-[#0a1118]" />
                    {/* Bounding box 1 */}
                    <div className="absolute left-[26%] top-[30%] w-[18%] h-[50%] border border-[#FF5751] bg-[#FF5751]/10 rounded-xs flex items-center justify-center">
                      <div className="w-2.5 h-6 bg-neutral-400/50 rounded-xs" />
                    </div>
                    {/* Bounding box 2 */}
                    <div className="absolute left-[64%] top-[25%] w-[18%] h-[50%] border border-[#FF5751] bg-[#FF5751]/10 rounded-xs flex items-center justify-center">
                      <div className="w-2.5 h-6 bg-neutral-400/50 rounded-xs" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                    <span>Illustrative preview</span>
                    <IllustrativeBadge label="Illustrative example" />
                  </div>
                </div>
              </div>

              {/* Caption Under Hero Map (Honesty Rule 5c) */}
              <p className="mt-3 text-xs text-neutral-400 text-center sm:text-left italic">
                Illustrative visualization. ResQVision currently detects people in supplied images.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PRODUCT SECTION (Design 2, anchor #product) */}
      <section
        id="product"
        className="py-20 sm:py-28 border-b border-white/[0.06] bg-[#060C14]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Section Header */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-3">
              <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
                THE RESQVISION PLATFORM
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                From visual evidence{" "}
                <span className="bg-gradient-to-r from-[#FF5751] to-[#FF8863] bg-clip-text text-transparent">
                  to actionable insight.
                </span>
              </h2>
              <p className="text-neutral-400 text-sm sm:text-base leading-relaxed max-w-2xl">
                ResQVision combines computer vision, AI-powered reasoning, and structured incident management to help teams analyze disaster imagery, interpret what is visible, and organize information for further review.
              </p>
            </div>

            {/* Top Right 3 Feature Pills */}
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Feature 1: Visual Detection (Honesty Rule 5a applied) */}
              <div className="p-3.5 rounded-xl bg-[#091520] border border-white/10 hover:border-white/20 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-[#FF5751]/15 text-[#FF5751] flex items-center justify-center mb-2.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div className="text-xs font-semibold text-white mb-1">
                  Visual Detection
                </div>
                <div className="text-[11px] text-neutral-400 leading-snug">
                  Identify people in disaster imagery.
                </div>
              </div>

              {/* Feature 2: AI Reasoning */}
              <div className="p-3.5 rounded-xl bg-[#091520] border border-white/10 hover:border-white/20 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-[#FBAA24]/15 text-[#FBAA24] flex items-center justify-center mb-2.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a4 4 0 0 0-4 4v1a3 3 0 0 0-2 2.8c0 1.2.7 2.2 1.7 2.7-.4.5-.7 1.2-.7 2a3 3 0 0 0 3 3v1a2 2 0 0 0 4 0v-1a3 3 0 0 0 3-3c0-.8-.3-1.5-.7-2 1-.5 1.7-1.5 1.7-2.7a3 3 0 0 0-2-2.8V6a4 4 0 0 0-4-4z" />
                  </svg>
                </div>
                <div className="text-xs font-semibold text-white mb-1">
                  AI Reasoning
                </div>
                <div className="text-[11px] text-neutral-400 leading-snug">
                  Interpret evidence and highlight potential risks.
                </div>
              </div>

              {/* Feature 3: Incident Records */}
              <div className="p-3.5 rounded-xl bg-[#091520] border border-white/10 hover:border-white/20 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-[#3DF0C2]/15 text-[#3DF0C2] flex items-center justify-center mb-2.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                  </svg>
                </div>
                <div className="text-xs font-semibold text-white mb-1">
                  Incident Records
                </div>
                <div className="text-[11px] text-neutral-400 leading-snug">
                  Keep analysis results organized and traceable.
                </div>
              </div>
            </div>
          </div>

          {/* Main 2-Column Mock Showcase */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Panel: VISUAL ANALYSIS */}
            <div className="lg:col-span-7 rounded-2xl bg-[#08141F] border border-white/10 overflow-hidden flex flex-col justify-between shadow-2xl">
              {/* Header */}
              <div className="px-5 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-[#0A1825]/50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white tracking-wide">
                    <svg className="w-4 h-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span>VISUAL ANALYSIS</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#3DF0C2] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3DF0C2]" />
                    <span>Analysis complete</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <IllustrativeBadge label="Illustrative example" />
                  {/* Non-interactive mock visual control */}
                  <span
                    aria-hidden="true"
                    className="hidden sm:inline-flex items-center px-3 py-1 rounded-md text-xs font-medium text-neutral-400 bg-white/5 border border-white/10 select-none cursor-default"
                  >
                    Change image
                  </span>
                  {/* Real Link Button */}
                  <Link
                    href="/analyze"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-[#FF5751] hover:bg-[#FF6E68] transition-colors focus-visible:outline-2 focus-visible:outline-white"
                  >
                    <span>Analyze an image</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>

              {/* Rubble Scene Visual with 3 person detections */}
              <div className="p-4 flex-1 flex flex-col justify-center">
                <RubbleSceneVisual
                  detections={[
                    { label: "Person 0.87", x: "24%", y: "42%", w: "12%", h: "28%" },
                    { label: "Person 0.82", x: "64%", y: "40%", w: "11%", h: "26%" },
                    { label: "Person 0.79", x: "46%", y: "54%", w: "12%", h: "27%" },
                  ]}
                  aspect="aspect-[16/10]"
                />
              </div>

              {/* Visual Evidence Detail Strip (Honesty Rule 5a applied) */}
              <div className="px-5 py-3.5 border-t border-white/10 bg-[#091724] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-neutral-300 shrink-0">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white">Visual evidence</div>
                    <div className="text-[11px] text-neutral-400 truncate">
                      Computer vision highlights people detected in the supplied image.
                    </div>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#FF5751]/15 border border-[#FF5751]/30 text-[#FF5751] text-xs font-semibold shrink-0">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span>3 people detected</span>
                </div>
              </div>
            </div>

            {/* Right Panel: INCIDENT REASONING */}
            <div className="lg:col-span-5 rounded-2xl bg-[#08141F] border border-white/10 overflow-hidden flex flex-col justify-between shadow-2xl">
              {/* Header */}
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3 bg-[#0A1825]/50">
                <div className="flex items-center gap-2 text-xs font-semibold text-white tracking-wide">
                  <svg className="w-4 h-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
                  </svg>
                  <span>INCIDENT REASONING</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#3DF0C2] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3DF0C2]" />
                    <span>Analysis complete</span>
                  </div>
                  <IllustrativeBadge label="Illustrative example" />
                </div>
              </div>

              {/* Reasoning Body Items */}
              <div className="p-5 space-y-4 flex-1">
                {/* Red Callout Box: Assessment */}
                <div className="p-4 rounded-xl bg-[#FF5751]/10 border border-[#FF5751]/30 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#FF5751]/20 text-[#FF5751] flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="12 2 2 22 22 22" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold tracking-wider uppercase text-neutral-400">
                        Assessment
                      </div>
                      <div className="text-sm font-bold text-[#FF5751]">
                        Further review recommended
                      </div>
                      <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                        The image may indicate a high-risk situation.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 1: Observed Evidence (Honesty Rule 5b applied) */}
                <div className="p-3.5 rounded-xl bg-[#0B1A28] border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <svg className="w-3.5 h-3.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                    </svg>
                    <span>Observed evidence</span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed pl-5.5">
                    3 person detections are present in the analyzed image.
                  </p>
                </div>

                {/* Section 2: Interpretation */}
                <div className="p-3.5 rounded-xl bg-[#0B1A28] border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <svg className="w-3.5 h-3.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <span>Interpretation</span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed pl-5.5">
                    The image may warrant closer inspection in the context of the reported incident. The visual evidence alone does not establish whether the individuals are injured or require rescue.
                  </p>
                </div>

                {/* Section 3: Recommended Next Step */}
                <div className="p-3.5 rounded-xl bg-[#0B1A28] border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <svg className="w-3.5 h-3.5 text-[#3DF0C2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 16 16 12 12 8" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    <span>Recommended next step</span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed pl-5.5">
                    Review the annotated image and confirm the incident context with additional information if available.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom 3-Column Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {/* Card 01: Computer Vision */}
            <div className="p-5 rounded-2xl bg-[#08141F] border border-white/10 flex flex-col justify-between shadow-xl">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-neutral-400">01</span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#FF5751]/15 text-[#FF5751] border border-[#FF5751]/30 uppercase">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2a4 4 0 0 0-4 4v1H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z" />
                      </svg>
                      COMPUTER VISION
                    </span>
                  </div>
                  <IllustrativeBadge label="Illustrative example" />
                </div>
                <h3 className="text-base font-bold text-white">See what is in the frame.</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Use computer vision to detect people in supplied imagery and return structured detection results, including bounding boxes and confidence scores.
                </p>
              </div>

              {/* Right Mini Graphic: Person with bounding box */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-center">
                <div className="relative w-full h-24 bg-[#0A1624] rounded-lg overflow-hidden border border-white/10 flex items-center justify-center">
                  <div className="relative w-14 h-18 border border-[#FF5751] bg-[#FF5751]/15 rounded-xs flex items-center justify-center">
                    <div className="absolute -top-4 left-0 bg-[#FF5751] text-white font-mono text-[8px] font-bold px-1 rounded-xs">
                      Person 0.84
                    </div>
                    {/* Simulated person silhouette */}
                    <div className="w-5 h-12 bg-neutral-300/40 rounded-sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 02: AI Reasoning */}
            <div className="p-5 rounded-2xl bg-[#08141F] border border-white/10 flex flex-col justify-between shadow-xl">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-neutral-400">02</span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#FBAA24]/15 text-[#FBAA24] border border-[#FBAA24]/30 uppercase">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2a4 4 0 0 0-4 4v1H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z" />
                      </svg>
                      AI REASONING
                    </span>
                  </div>
                  <IllustrativeBadge label="Illustrative example" />
                </div>
                <h3 className="text-base font-bold text-white">Turn detections into context.</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Combine structured visual evidence with incident context to produce concise assessments, explain uncertainty, and suggest review steps.
                </p>
              </div>

              {/* Right Mini Graphic: Incident Assessment pills */}
              <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
                <div className="p-2.5 rounded-lg bg-[#0A1624] border border-white/10 space-y-1.5 text-[11px]">
                  <div className="text-[10px] text-neutral-400 font-semibold tracking-wider">
                    Incident Assessment
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Risk Level</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF5751]/20 text-[#FF5751] border border-[#FF5751]/30">
                      High
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Confidence</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FBAA24]/20 text-[#FBAA24] border border-[#FBAA24]/30">
                      Moderate
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Next Step</span>
                    <span className="text-neutral-200 font-medium">Further review</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 03: Incident Management */}
            <div className="p-5 rounded-2xl bg-[#08141F] border border-white/10 flex flex-col justify-between shadow-xl">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-neutral-400">03</span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#3DF0C2]/15 text-[#3DF0C2] border border-[#3DF0C2]/30 uppercase">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <ellipse cx="12" cy="5" rx="9" ry="3" />
                      </svg>
                      INCIDENT MANAGEMENT
                    </span>
                  </div>
                  <IllustrativeBadge label="Illustrative example" />
                </div>
                <h3 className="text-base font-bold text-white">Keep every analysis traceable.</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Preserve essential analysis results so users can revisit detection evidence, review incident assessments, and inspect previous analyses.
                </p>
              </div>

              {/* Right Mini Graphic: 3 Incident items with thumbnails */}
              <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5">
                {/* Item 1: Wildfire */}
                <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#0A1624] border border-white/5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-5 rounded overflow-hidden relative bg-[#1E293B]">
                      <Image
                        src="/assets/thumb_wildfire.png"
                        alt="Wildfire thumbnail"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-semibold text-white">Wildfire Incident</div>
                      <div className="text-[10px] text-neutral-400">12 min ago</div>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FF5751]/20 text-[#FF5751]">
                    High
                  </span>
                </div>

                {/* Item 2: Flood */}
                <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#0A1624] border border-white/5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-5 rounded overflow-hidden relative bg-[#1E293B]">
                      <Image
                        src="/assets/thumb_flood.png"
                        alt="Flood thumbnail"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-semibold text-white">Flood Assessment</div>
                      <div className="text-[10px] text-neutral-400">2 hours ago</div>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FBAA24]/20 text-[#FBAA24]">
                    Moderate
                  </span>
                </div>

                {/* Item 3: Landslide */}
                <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#0A1624] border border-white/5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-5 rounded overflow-hidden relative bg-[#1E293B]">
                      <Image
                        src="/assets/thumb_landslide.png"
                        alt="Landslide thumbnail"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-semibold text-white">Landslide Alert</div>
                      <div className="text-[10px] text-neutral-400">5 hours ago</div>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FBAA24]/20 text-[#FBAA24]">
                    Moderate
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS SECTION (Design 3, anchor #how-it-works) */}
      <section
        id="how-it-works"
        className="py-20 sm:py-28 border-b border-white/[0.06] bg-[#071018]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          {/* Section Header */}
          <div className="space-y-3 max-w-3xl">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
              HOW RESQVISION WORKS
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
              From visual evidence{" "}
              <span className="bg-gradient-to-r from-[#FF5751] to-[#FF8863] bg-clip-text text-transparent">
                to informed action.
              </span>
            </h2>
            <p className="text-neutral-400 text-sm sm:text-base leading-relaxed">
              ResQVision combines computer vision with evidence-based AI reasoning to turn disaster imagery into structured incident information, giving teams a clearer starting point for human review.
            </p>
          </div>

          {/* 3 Main Process Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start relative">
            {/* Step 01: ANALYZE */}
            <div className="space-y-5 flex flex-col justify-between h-full">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-[#FF5751] text-white flex items-center justify-center text-xs font-bold">
                      01
                    </span>
                    <span className="text-xs font-bold tracking-wider uppercase text-[#FF5751]">
                      ANALYZE
                    </span>
                  </div>
                  <span className="text-neutral-500 font-mono hidden lg:inline-block" aria-hidden="true">
                    →
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">Start with the scene.</h3>
                <p className="text-xs text-neutral-400 leading-relaxed min-h-[40px]">
                  Provide an image from a disaster-related scene. ResQVision prepares it for visual analysis and identifies the evidence available in the frame.
                </p>
              </div>

              {/* Step 01 Card Mock */}
              <div className="rounded-2xl bg-[#091522] border border-white/10 overflow-hidden shadow-xl flex flex-col justify-between">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between text-xs bg-[#0A1826]">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <svg className="w-3.5 h-3.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                    </svg>
                    <span>IMAGE INPUT</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#3DF0C2]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3DF0C2]" />
                    <span>Ready for analysis</span>
                  </div>
                </div>

                <div className="p-4 relative">
                  <RubbleSceneVisual aspect="aspect-[16/10]" detections={[]} />
                  {/* Action Link: Choose image */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Link
                      href="/analyze"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black/75 hover:bg-black/90 text-white text-xs font-semibold backdrop-blur-md border border-white/20 transition-colors shadow-xl focus-visible:outline-2 focus-visible:outline-[#FF5751]"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span>Choose image</span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-white/10 bg-[#0A1826] text-[11px] text-neutral-400 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Source imagery</div>
                    <div>Visual evidence begins with the supplied image.</div>
                  </div>
                  <IllustrativeBadge label="Illustrative example" />
                </div>
              </div>
            </div>

            {/* Step 02: INTERPRET */}
            <div className="space-y-5 flex flex-col justify-between h-full">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-[#38E1FF] text-black flex items-center justify-center text-xs font-bold">
                      02
                    </span>
                    <span className="text-xs font-bold tracking-wider uppercase text-[#38E1FF]">
                      INTERPRET
                    </span>
                  </div>
                  <span className="text-neutral-500 font-mono hidden lg:inline-block" aria-hidden="true">
                    →
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">Find the evidence. Examine the context.</h3>
                <p className="text-xs text-neutral-400 leading-relaxed min-h-[40px]">
                  Computer vision returns structured person detections. The reasoning layer combines those results with available incident context to produce a cautious assessment.
                </p>
              </div>

              {/* Step 02 Card Mock */}
              <div className="rounded-2xl bg-[#091522] border border-white/10 overflow-hidden shadow-xl flex flex-col justify-between">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between text-xs bg-[#0A1826]">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <svg className="w-3.5 h-3.5 text-[#38E1FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="22" y1="12" x2="18" y2="12" />
                      <line x1="6" y1="12" x2="2" y2="12" />
                      <line x1="12" y1="6" x2="12" y2="2" />
                      <line x1="12" y1="22" x2="12" y2="18" />
                    </svg>
                    <span>DETECTION RESULTS</span>
                  </div>
                  <IllustrativeBadge label="Illustrative example" variant="teal" />
                </div>

                <div className="p-4 relative">
                  <RubbleSceneVisual
                    aspect="aspect-[16/10]"
                    detections={[
                      { label: "Person 0.87", x: "32%", y: "44%", w: "13%", h: "30%" },
                      { label: "Person 0.82", x: "62%", y: "38%", w: "12%", h: "28%" },
                    ]}
                  />
                  {/* Non-interactive Mock Zoom / Pan Controls (Aria-hidden per Rule 7) */}
                  <div
                    aria-hidden="true"
                    className="absolute top-6 right-6 flex flex-col gap-1 bg-black/60 backdrop-blur-md rounded border border-white/10 p-1 pointer-events-none select-none"
                  >
                    <span className="w-5 h-5 flex items-center justify-center text-xs text-neutral-300">
                      +
                    </span>
                    <span className="w-5 h-5 flex items-center justify-center text-xs text-neutral-300">
                      −
                    </span>
                    <span className="w-5 h-5 flex items-center justify-center text-[10px] text-neutral-400">
                      ⛶
                    </span>
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-white/10 bg-[#0A1826] text-[11px] text-neutral-400 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#FF5751]" />
                    <span className="font-semibold text-white">2 people detected</span>
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    Detections include bounding boxes & confidence scores.
                  </div>
                </div>
              </div>
            </div>

            {/* Step 03: REVIEW */}
            <div className="space-y-5 flex flex-col justify-between h-full">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-[#3DF0C2] text-black flex items-center justify-center text-xs font-bold">
                      03
                    </span>
                    <span className="text-xs font-bold tracking-wider uppercase text-[#3DF0C2]">
                      REVIEW
                    </span>
                  </div>
                  <IllustrativeBadge label="Illustrative example" />
                </div>
                <h3 className="text-lg font-bold text-white">Turn findings into a reviewable record.</h3>
                <p className="text-xs text-neutral-400 leading-relaxed min-h-[40px]">
                  Inspect the annotated evidence, review the AI-generated assessment, and preserve the result so it can be revisited later.
                </p>
              </div>

              {/* Step 03 Card Mock */}
              <div className="rounded-2xl bg-[#091522] border border-white/10 overflow-hidden shadow-xl flex flex-col justify-between">
                <div className="p-4 space-y-3">
                  {/* Red Assessment Callout */}
                  <div className="p-3 rounded-xl bg-[#FF5751]/10 border border-[#FF5751]/30">
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded bg-[#FF5751]/20 text-[#FF5751] flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="12 2 2 22 22 22" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[9px] font-semibold tracking-wider uppercase text-neutral-400">
                          ASSESSMENT
                        </div>
                        <div className="text-xs font-bold text-[#FF5751] truncate">
                          Further review recommended
                        </div>
                        <p className="text-[10px] text-neutral-300 mt-0.5 leading-snug">
                          The image may warrant closer inspection in the context of the reported incident.
                        </p>
                      </div>
                      <span className="text-neutral-400 text-xs">›</span>
                    </div>
                  </div>

                  {/* Supporting Evidence */}
                  <div className="p-2.5 rounded-lg bg-[#0A1826] border border-white/5 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-neutral-300">
                      <svg className="w-3 h-3 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                      </svg>
                      <span>SUPPORTING EVIDENCE</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-snug">
                      Person detections were returned for the supplied image.
                    </p>
                  </div>

                  {/* Context & Uncertainty */}
                  <div className="p-2.5 rounded-lg bg-[#0A1826] border border-white/5 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#FBAA24]">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="12 2 2 22 22 22" />
                      </svg>
                      <span>CONTEXT & UNCERTAINTY</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-snug">
                      Visual detections alone do not establish whether the individuals are injured or require rescue.
                    </p>
                  </div>

                  {/* Suggested Next Step */}
                  <div className="p-2.5 rounded-lg bg-[#0A1826] border border-white/5 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#3DF0C2]">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 16 16 12 12 8" />
                      </svg>
                      <span>SUGGESTED NEXT STEP</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-snug">
                      Review the annotated image and confirm the incident context using additional information where available.
                    </p>
                  </div>
                </div>

                {/* Bottom Bar with Real Links */}
                <div className="px-4 py-3 border-t border-white/10 bg-[#0A1826] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-neutral-400">
                    <svg className="w-3.5 h-3.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <ellipse cx="12" cy="5" rx="9" ry="3" />
                      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                    </svg>
                    <span>Save to incident records</span>
                  </div>
                  <Link
                    href="/incidents"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-white hover:text-[#FF5751] transition-colors focus-visible:outline-2 focus-visible:outline-[#FF5751]"
                  >
                    <span>Explore records</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Summary Strip */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#091522] border border-white/10 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Step 1 */}
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-[#FF5751]/20 border border-[#FF5751]/40 text-[#FF5751] flex items-center justify-center text-xs font-bold shrink-0">
                  01
                </span>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#FF5751]">
                    INPUT
                  </div>
                  <div className="text-xs font-semibold text-white">Supply an image</div>
                  <div className="text-[11px] text-neutral-400">Start with disaster-related imagery.</div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-[#38E1FF]/20 border border-[#38E1FF]/40 text-[#38E1FF] flex items-center justify-center text-xs font-bold shrink-0">
                  02
                </span>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#38E1FF]">
                    ANALYSIS
                  </div>
                  <div className="text-xs font-semibold text-white">Structure the evidence</div>
                  <div className="text-[11px] text-neutral-400">Run person detection and assess the returned results.</div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-[#3DF0C2]/20 border border-[#3DF0C2]/40 text-[#3DF0C2] flex items-center justify-center text-xs font-bold shrink-0">
                  03
                </span>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#3DF0C2]">
                    REVIEW
                  </div>
                  <div className="text-xs font-semibold text-white">Inspect the assessment</div>
                  <div className="text-[11px] text-neutral-400">Examine the findings and preserve the analysis.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. TECHNOLOGY SECTION (Design 4, anchor #technology) */}
      <section
        id="technology"
        className="py-20 sm:py-28 border-b border-white/[0.06] bg-[#060C14]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Section Header */}
          <div className="space-y-3 max-w-3xl">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
              THE TECHNOLOGY
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
              Built to turn visual evidence{" "}
              <span className="bg-gradient-to-r from-[#FF5751] to-[#FF8863] bg-clip-text text-transparent">
                into structured intelligence.
              </span>
            </h2>
            <p className="text-neutral-400 text-sm sm:text-base leading-relaxed">
              Computer vision, AI-assisted reasoning, and incident records in one focused processing pipeline.
            </p>
          </div>

          {/* 5-Step Pipeline Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 01: Frontend */}
            <div className="p-4 rounded-xl bg-[#08141F] border border-white/10 hover:border-white/20 transition-colors flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-neutral-400">01</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-white/5 border border-white/10 text-neutral-300">
                    FRONTEND
                  </span>
                </div>
                <div className="text-xs font-bold text-white tracking-wide">IMAGE INPUT</div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Accepts disaster imagery and initiates analysis workflow.
                </p>
              </div>
            </div>

            {/* 02: FastAPI */}
            <div className="p-4 rounded-xl bg-[#08141F] border border-white/10 hover:border-white/20 transition-colors flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-neutral-400">02</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#38E1FF]/10 border border-[#38E1FF]/30 text-[#38E1FF]">
                    FASTAPI
                  </span>
                </div>
                <div className="text-xs font-bold text-white tracking-wide">REQUEST PROCESSING</div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Validates inputs and coordinates the processing pipeline.
                </p>
              </div>
            </div>

            {/* 03: YOLO (Active Highlighted Step in Design 4) */}
            <div className="p-4 rounded-xl bg-[#0C1A27] border-2 border-[#FF5751] shadow-lg shadow-[#FF5751]/10 flex flex-col justify-between space-y-3 relative">
              <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#FF5751] text-white tracking-wider uppercase shadow">
                ACTIVE FOCUS
              </span>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#FF5751]">03</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#FF5751]/20 border border-[#FF5751]/40 text-[#FF5751]">
                    YOLO
                  </span>
                </div>
                <div className="text-xs font-bold text-white tracking-wide">VISUAL DETECTION</div>
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  Returns person detections, bounding boxes, and confidence scores.
                </p>
              </div>
            </div>

            {/* 04: Groq API */}
            <div className="p-4 rounded-xl bg-[#08141F] border border-white/10 hover:border-white/20 transition-colors flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-neutral-400">04</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#FBAA24]/10 border border-[#FBAA24]/30 text-[#FBAA24]">
                    GROQ API
                  </span>
                </div>
                <div className="text-xs font-bold text-white tracking-wide">EVIDENCE REASONING</div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Interprets structured detections alongside incident context.
                </p>
              </div>
            </div>

            {/* 05: Local JSON */}
            <div className="p-4 rounded-xl bg-[#08141F] border border-white/10 hover:border-white/20 transition-colors flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-neutral-400">05</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#3DF0C2]/10 border border-[#3DF0C2]/30 text-[#3DF0C2]">
                    LOCAL JSON
                  </span>
                </div>
                <div className="text-xs font-bold text-white tracking-wide">INCIDENT RECORD</div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Presents analysis results and preserves records for later review.
                </p>
              </div>
            </div>
          </div>

          {/* Visual Detection Detail Strip */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#091522] border border-white/10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center shadow-xl">
            {/* Left summary */}
            <div className="md:col-span-5 flex items-start gap-3">
              <div className="w-12 h-12 rounded-lg bg-[#FF5751]/15 border border-[#FF5751]/30 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-[#FF5751]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="22" y1="12" x2="18" y2="12" />
                  <line x1="6" y1="12" x2="2" y2="12" />
                  <line x1="12" y1="6" x2="12" y2="2" />
                  <line x1="12" y1="22" x2="12" y2="18" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-bold text-white uppercase tracking-wider">
                  VISUAL DETECTION
                </div>
                <div className="text-xs text-neutral-300 leading-relaxed mt-1">
                  Uses a YOLO-based model to identify people in the supplied image and return structured detection results.
                </div>
              </div>
            </div>

            {/* Input Spec */}
            <div className="md:col-span-2 space-y-1 border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300">
                <svg className="w-3.5 h-3.5 text-[#38E1FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Input</span>
              </div>
              <div className="text-[11px] text-neutral-400">
                Validated image from the backend.
              </div>
            </div>

            {/* Output Spec */}
            <div className="md:col-span-2 space-y-1 border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300">
                <svg className="w-3.5 h-3.5 text-[#3DF0C2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span>Output</span>
              </div>
              <div className="text-[11px] text-neutral-400">
                Person detections, bounding boxes, confidence scores (when available).
              </div>
            </div>

            {/* Limitations Spec */}
            <div className="md:col-span-3 space-y-1 border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#FBAA24]">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12 2 2 22 22 22" />
                </svg>
                <span>Limitations</span>
              </div>
              <div className="text-[11px] text-neutral-400">
                Detections do not establish whether a person is injured or in immediate danger.
              </div>
            </div>
          </div>

          {/* 2-Column Code & Image Comparison Panel (Real ARCHITECTURE.md Schema per Rule C.8) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: INPUT / DISASTER IMAGE */}
            <div className="lg:col-span-6 rounded-2xl bg-[#08141F] border border-white/10 overflow-hidden flex flex-col justify-between shadow-2xl">
              <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between text-xs font-semibold text-neutral-300 bg-[#0A1826]">
                <span>INPUT / DISASTER IMAGE</span>
                <IllustrativeBadge label="Illustrative example" />
              </div>

              <div className="p-4 flex-1 flex flex-col justify-center">
                <RubbleSceneVisual
                  aspect="aspect-[16/10]"
                  detections={[
                    { label: "Person 0.87", x: "28%", y: "42%", w: "12%", h: "28%" },
                    { label: "Person 0.78", x: "66%", y: "46%", w: "11%", h: "26%" },
                  ]}
                />
              </div>

              <div className="px-5 py-3 border-t border-white/10 bg-[#0A1826] text-[11px] text-neutral-400 flex items-center justify-between">
                <span>Evaluated against YOLO Person Class (index 0)</span>
                <span className="font-mono text-neutral-300">2 detections</span>
              </div>
            </div>

            {/* Right: OUTPUT / STRUCTURED EVIDENCE (Schema from docs/ARCHITECTURE.md) */}
            <div className="lg:col-span-6 rounded-2xl bg-[#08141F] border border-white/10 overflow-hidden flex flex-col justify-between shadow-2xl">
              <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between text-xs font-semibold text-neutral-300 bg-[#0A1826]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#3DF0C2]" />
                  <span>OUTPUT / STRUCTURED EVIDENCE</span>
                </div>
                <IllustrativeBadge label="Illustrative example" variant="teal" />
              </div>

              {/* Real JSON Code Snippet */}
              <div className="p-4 bg-[#050E17] font-mono text-[11px] sm:text-xs leading-relaxed overflow-x-auto select-text text-neutral-300">
                <pre className="space-y-0.5">
                  <code>
                    <span className="text-neutral-500 select-none"> 1  </span>{"{"}
                    <br />
                    <span className="text-neutral-500 select-none"> 2    </span>
                    <span className="text-[#38E1FF]">&quot;detections&quot;</span>: [
                    <br />
                    <span className="text-neutral-500 select-none"> 3      </span>{"{"}
                    <br />
                    <span className="text-neutral-500 select-none"> 4        </span><span className="text-[#38E1FF]">&quot;id&quot;</span>: <span className="text-[#FF8863]">&quot;det_1&quot;</span>,
                    <br />
                    <span className="text-neutral-500 select-none"> 5        </span><span className="text-[#38E1FF]">&quot;class_name&quot;</span>: <span className="text-neutral-200">&quot;person&quot;</span>,
                    <br />
                    <span className="text-neutral-500 select-none"> 6        </span><span className="text-[#38E1FF]">&quot;confidence&quot;</span>: <span className="text-[#FBAA24]">0.87</span>,
                    <br />
                    <span className="text-neutral-500 select-none"> 7        </span><span className="text-[#38E1FF]">&quot;bbox&quot;</span>: {"{"} <span className="text-[#38E1FF]">&quot;x1&quot;</span>: <span className="text-[#FBAA24]">0.28</span>, <span className="text-[#38E1FF]">&quot;y1&quot;</span>: <span className="text-[#FBAA24]">0.42</span>, <span className="text-[#38E1FF]">&quot;x2&quot;</span>: <span className="text-[#FBAA24]">0.40</span>, <span className="text-[#38E1FF]">&quot;y2&quot;</span>: <span className="text-[#FBAA24]">0.70</span> {"}"}
                    <br />
                    <span className="text-neutral-500 select-none"> 8      </span>{"}"},
                    <br />
                    <span className="text-neutral-500 select-none"> 9      </span>{"{"}
                    <br />
                    <span className="text-neutral-500 select-none">10        </span><span className="text-[#38E1FF]">&quot;id&quot;</span>: <span className="text-[#FF8863]">&quot;det_2&quot;</span>,
                    <br />
                    <span className="text-neutral-500 select-none">11        </span><span className="text-[#38E1FF]">&quot;class_name&quot;</span>: <span className="text-neutral-200">&quot;person&quot;</span>,
                    <br />
                    <span className="text-neutral-500 select-none">12        </span><span className="text-[#38E1FF]">&quot;confidence&quot;</span>: <span className="text-[#FBAA24]">0.78</span>,
                    <br />
                    <span className="text-neutral-500 select-none">13        </span><span className="text-[#38E1FF]">&quot;bbox&quot;</span>: {"{"} <span className="text-[#38E1FF]">&quot;x1&quot;</span>: <span className="text-[#FBAA24]">0.66</span>, <span className="text-[#38E1FF]">&quot;y1&quot;</span>: <span className="text-[#FBAA24]">0.46</span>, <span className="text-[#38E1FF]">&quot;x2&quot;</span>: <span className="text-[#FBAA24]">0.77</span>, <span className="text-[#38E1FF]">&quot;y2&quot;</span>: <span className="text-[#FBAA24]">0.72</span> {"}"}
                    <br />
                    <span className="text-neutral-500 select-none">14      </span>{"}"}
                    <br />
                    <span className="text-neutral-500 select-none">15    </span>],
                    <br />
                    <span className="text-neutral-500 select-none">16    </span>
                    <span className="text-[#38E1FF]">&quot;assessment&quot;</span>: {"{"}
                    <br />
                    <span className="text-neutral-500 select-none">17      </span>
                    <span className="text-[#38E1FF]">&quot;severity&quot;</span>: <span className="text-[#FF5751]">&quot;HIGH&quot;</span>,
                    <br />
                    <span className="text-neutral-500 select-none">18      </span>
                    <span className="text-[#38E1FF]">&quot;category&quot;</span>: <span className="text-neutral-200">&quot;Structural Collapse&quot;</span>,
                    <br />
                    <span className="text-neutral-500 select-none">19      </span>
                    <span className="text-[#38E1FF]">&quot;summary&quot;</span>: <span className="text-neutral-200">&quot;Multiple persons detected near structural rubble.&quot;</span>,
                    <br />
                    <span className="text-neutral-500 select-none">20      </span>
                    <span className="text-[#38E1FF]">&quot;evidence&quot;</span>: [
                    <br />
                    <span className="text-neutral-500 select-none">21        </span><span className="text-neutral-200">&quot;2 person detections present in analyzed frame&quot;</span>
                    <br />
                    <span className="text-neutral-500 select-none">22      </span>],
                    <br />
                    <span className="text-neutral-500 select-none">23      </span>
                    <span className="text-[#38E1FF]">&quot;uncertainty&quot;</span>: <span className="text-[#FBAA24]">&quot;Visual evidence alone does not confirm medical injury or urgency&quot;</span>
                    <br />
                    <span className="text-neutral-500 select-none">24    </span>{"}"}
                    <br />
                    <span className="text-neutral-500 select-none">25  </span>{"}"}
                  </code>
                </pre>
              </div>

              <div className="px-5 py-3 border-t border-white/10 bg-[#0A1826] text-[11px] text-neutral-400 flex items-center justify-between">
                <span>FastAPI backend schema adheres strictly to Pydantic models</span>
                <span className="text-[#3DF0C2] font-medium">Validated output</span>
              </div>
            </div>
          </div>

          {/* Bottom 3 Principle Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {/* Principle 1 */}
            <div className="p-6 rounded-2xl bg-[#08141F] border border-white/10 space-y-3 shadow-xl">
              <div className="w-10 h-10 rounded-full bg-[#FF5751]/15 text-[#FF5751] border border-[#FF5751]/30 flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div className="text-sm font-bold tracking-wide uppercase text-white">
                EVIDENCE FIRST
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Separate model detections from AI-generated interpretation.
              </p>
            </div>

            {/* Principle 2 */}
            <div className="p-6 rounded-2xl bg-[#08141F] border border-white/10 space-y-3 shadow-xl">
              <div className="w-10 h-10 rounded-full bg-[#38E1FF]/15 text-[#38E1FF] border border-[#38E1FF]/30 flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="text-sm font-bold tracking-wide uppercase text-white">
                HUMAN REVIEW
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Present assessments as decision-support information, not definitive emergency conclusions.
              </p>
            </div>

            {/* Principle 3 */}
            <div className="p-6 rounded-2xl bg-[#08141F] border border-white/10 space-y-3 shadow-xl">
              <div className="w-10 h-10 rounded-full bg-[#3DF0C2]/15 text-[#3DF0C2] border border-[#3DF0C2]/30 flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
              </div>
              <div className="text-sm font-bold tracking-wide uppercase text-white">
                MINIMAL INFRASTRUCTURE
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Use a focused processing pipeline and lightweight persistence appropriate to the application&apos;s scope.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ABOUT SECTION (Instruction C.9, anchor #about) */}
      <section
        id="about"
        className="py-20 sm:py-28 bg-[#071018] border-b border-white/[0.06]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Section Header */}
          <div className="space-y-3 max-w-2xl">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-400">
              SCOPE & PRINCIPLES
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              What ResQVision is,{" "}
              <span className="bg-gradient-to-r from-[#FF5751] to-[#FF8863] bg-clip-text text-transparent">
                and isn&apos;t.
              </span>
            </h2>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Clear boundaries and explicit transparency guide every capability in the ResQVision architecture.
            </p>
          </div>

          {/* 3 Explicit Statements (Instruction C.9) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Statement 1 */}
            <div className="p-6 rounded-2xl bg-[#08141F] border border-white/10 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[#FF5751]/20 text-[#FF5751] flex items-center justify-center font-bold text-sm">
                01
              </div>
              <h3 className="text-base font-bold text-white">Detection, Not Identification</h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                ResQVision detects people in supplied imagery using a lightweight, optimized YOLO model. It isolates visual bounding boxes without facial recognition, biometric identity profiling, or surveillance tracking.
              </p>
            </div>

            {/* Statement 2 */}
            <div className="p-6 rounded-2xl bg-[#08141F] border border-white/10 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[#38E1FF]/20 text-[#38E1FF] flex items-center justify-center font-bold text-sm">
                02
              </div>
              <h3 className="text-base font-bold text-white">Evidence-Only AI Reasoning</h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                The reasoning layer evaluates only structured, measured evidence (counts, bounding boxes, spatial distribution) and never sees the raw image. This prevents visual hallucination and ensures every conclusion cites auditable data.
              </p>
            </div>

            {/* Statement 3 */}
            <div className="p-6 rounded-2xl bg-[#08141F] border border-white/10 space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[#3DF0C2]/20 text-[#3DF0C2] flex items-center justify-center font-bold text-sm">
                03
              </div>
              <h3 className="text-base font-bold text-white">Decision-Support, Not Dispatch</h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                ResQVision is decision-support technology designed to help human teams verify and prioritize incident imagery. It is not an automated emergency dispatch service, nor a substitute for on-the-ground first-responder judgment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MINIMAL FOOTER */}
      <footer className="py-12 bg-[#060C14] text-neutral-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-white/10">
            {/* Wordmark */}
            <div className="flex items-center gap-2.5">
              <LogoMark className="w-7 h-7" />
              <span className="text-base font-bold text-white">ResQVision</span>
              <span className="text-neutral-500 font-normal">| AI-Assisted Disaster Intelligence</span>
            </div>

            {/* Footer Navigation Links */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs">
              <a href="#product" className="hover:text-white transition-colors">
                Product
              </a>
              <a href="#how-it-works" className="hover:text-white transition-colors">
                How It Works
              </a>
              <a href="#technology" className="hover:text-white transition-colors">
                Technology
              </a>
              <a href="#about" className="hover:text-white transition-colors">
                About
              </a>
              <Link href="/incidents" className="hover:text-white transition-colors">
                Incident Records
              </Link>
              <Link href="/map" className="hover:text-white transition-colors">
                Live Map
              </Link>
            </div>

            {/* Launch CTA */}
            <Link
              href="/analyze"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors focus-visible:outline-2 focus-visible:outline-[#FF5751]"
            >
              <span>Launch ResQVision</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-500">
            <div>
              &copy; 2026 ResQVision. Built for high-reliability evidentiary triage.
            </div>
            <div>
              Evidentiary reasoning core active &bull; Ultralytics YOLO &bull; Groq API
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
