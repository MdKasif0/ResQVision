"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BackendStatus } from "./BackendStatus";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Analyze", href: "/" },
    { label: "Incidents", href: "/incidents" },
    { label: "Live Map", href: "/map" },
  ];


  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#1F1D1A] flex flex-col font-sans">
      {/* Accessible skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-1.5 focus:bg-[#1F1D1A] focus:text-[#FFFFFF] focus:text-xs focus:rounded focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Top Application Bar */}
      <header className="sticky top-0 z-40 bg-[#FFFFFF] border-b border-[#E5E1D8] shadow-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Brand & Wordmark */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2.5 group focus-visible:outline-2 focus-visible:outline-[#1F1D1A] focus-visible:outline-offset-2 rounded"
            >
              <div className="w-7 h-7 rounded bg-[#1F1D1A] flex items-center justify-center text-[#FFFFFF] font-semibold text-xs tracking-wider">
                RQ
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight text-[#1F1D1A]">
                  ResQVision
                </span>
                <span className="text-[10px] text-[#6B665C] tracking-wide uppercase font-medium">
                  Incident Triage & Evidentiary Assessment
                </span>
              </div>
            </Link>
          </div>

          {/* Primary Navigation & Backend Status */}
          <div className="flex items-center gap-2 sm:gap-3">
            <nav
              aria-label="Main Navigation"
              className="flex items-center gap-1 sm:gap-2"
            >
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname?.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#1F1D1A] focus-visible:outline-offset-2 ${
                      isActive
                        ? "bg-[#1F1D1A] !text-[#FFFFFF]"
                        : "text-[#6B665C] hover:text-[#1F1D1A] hover:bg-[#FAF8F4]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="h-4 w-[1px] bg-[#E5E1D8] hidden sm:block" aria-hidden="true" />

            <BackendStatus theme="light" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>

      {/* Restrained System Status Footer */}
      <footer className="border-t border-[#E5E1D8] bg-[#FFFFFF] py-3 text-[11px] text-[#6B665C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5B6B3A]" aria-hidden="true" />
            <span>Evidentiary Reasoning Core Active</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Model: openai/gpt-oss-120b</span>
            <span>Vision: YOLO Nano (Person Class 0)</span>
            <span>Zero Raw Pixel Ingestion</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
