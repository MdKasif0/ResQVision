"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("Live Map");
  const [searchQuery, setSearchQuery] = useState("");
  const [todayDropdownOpen, setTodayDropdownOpen] = useState(false);

  return (
    <div className="relative w-full h-screen min-h-[760px] max-h-screen bg-[#070A11] text-white overflow-hidden font-sans select-none flex flex-col">
      {/* 1. Full-bleed Aerial Background Map */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0"
        style={{
          backgroundImage: "url('/background.jpg')",
        }}
      >
        {/* Soft linear gradient scrim to ensure dashboard legibility while keeping map vivid */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#070A11]/92 via-[#070A11]/45 to-transparent w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070A11]/75 via-transparent to-[#070A11]/35 w-full h-full" />
      </div>

      {/* 2. Top Header Navigation Bar */}
      <header className="relative z-30 w-full h-15 px-5 lg:px-7 flex items-center justify-between border-b border-white/5 bg-[#070A11]/25 backdrop-blur-md shrink-0">
        {/* Left Section: Brand & Nav Tabs */}
        <div className="flex items-center gap-3 lg:gap-7">
          {/* Logo & Brand Wordmark */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 relative flex items-center justify-center">
              <img
                src="/assets/logo.png"
                alt="ResQVision Logo"
                className="w-7 h-7 object-contain drop-shadow-[0_0_12px_rgba(255,107,107,0.45)]"
              />
            </div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-white font-sans">
              ResQVision
            </span>
          </Link>

          {/* Nav Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 ml-1">
            <button
              onClick={() => setActiveTab("Live Map")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
                activeTab === "Live Map"
                  ? "bg-white/12 border border-white/25 text-white shadow-[0_2px_12px_rgba(0,0,0,0.35)] backdrop-blur-md"
                  : "text-white/65 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#EF4444] shadow-[0_0_8px_#EF4444]" />
              <span>Live Map</span>
            </button>

            <Link
              href="/incidents"
              className="px-3.5 py-1.5 rounded-full text-white/65 hover:text-white hover:bg-white/5 text-xs font-medium transition-all"
            >
              Incidents
            </Link>

            <button
              onClick={() => setActiveTab("Resources")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === "Resources"
                  ? "bg-white/12 border border-white/25 text-white"
                  : "text-white/65 hover:text-white hover:bg-white/5"
              }`}
            >
              Resources
            </button>

            <button
              onClick={() => setActiveTab("Analytics")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === "Analytics"
                  ? "bg-white/12 border border-white/25 text-white"
                  : "text-white/65 hover:text-white hover:bg-white/5"
              }`}
            >
              Analytics
            </button>

            <button
              onClick={() => setActiveTab("Alerts")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === "Alerts"
                  ? "bg-white/12 border border-white/25 text-white"
                  : "text-white/65 hover:text-white hover:bg-white/5"
              }`}
            >
              Alerts
            </button>
          </nav>
        </div>

        {/* Right Section: Search Bar, Notifications, User Avatar */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Search Input Box */}
          <div className="relative hidden sm:flex items-center">
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/60 border border-white/15 text-white text-xs w-72 lg:w-80 backdrop-blur-md shadow-inner">
              <svg
                className="w-3.5 h-3.5 text-white/50 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search location, incident, or resource..."
                className="bg-transparent border-none outline-none text-white placeholder:text-white/40 text-xs w-full"
              />
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-white/50 font-mono tracking-tighter">
                <span>⌘</span>
                <span>K</span>
              </div>
            </div>
          </div>

          {/* Notification Bell */}
          <button
            aria-label="Notifications"
            className="relative w-8.5 h-8.5 rounded-full bg-slate-900/60 border border-white/15 flex items-center justify-center text-white/80 hover:text-white backdrop-blur-md transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
              />
            </svg>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#EF4444] text-[10px] font-bold text-white flex items-center justify-center border border-[#070A11] shadow-sm">
              3
            </span>
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-1.5 cursor-pointer pl-1">
            <img
              src="/assets/avatar.png"
              alt="User Avatar"
              className="w-8 h-8 rounded-full border border-white/20 object-cover shadow-sm"
            />
            <svg
              className="w-3.5 h-3.5 text-white/60"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 8.25l-7.5 7.5-7.5-7.5"
              />
            </svg>
          </div>
        </div>
      </header>

      {/* 3. Main Workspace Layout */}
      <div className="relative z-20 flex flex-1 w-full overflow-hidden">
        {/* Left Vertical Icon Dock */}
        <aside className="w-16 flex flex-col items-center py-4 gap-3.5 shrink-0 border-r border-white/5 bg-[#070A11]/30 backdrop-blur-md">
          {/* Active Home Icon with glowing red rounded square */}
          <button
            aria-label="Home Dashboard"
            className="w-10.5 h-10.5 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/45 text-[#F87171] flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.35)] transition-all"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
              />
            </svg>
          </button>

          {/* Map View Icon */}
          <button
            aria-label="Map View"
            className="w-9.5 h-9.5 rounded-xl text-white/55 hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934a1.12 1.12 0 01-.894 0L9.497 3.32a1.12 1.12 0 00-.894 0L3.728 5.757A1.125 1.125 0 003 6.763v11.53c0 .836.88 1.38 1.628 1.006l3.869-1.934a1.12 1.12 0 01.894 0l5.112 2.556a1.12 1.12 0 00.894 0z"
              />
            </svg>
          </button>

          {/* Alert Triangle Icon */}
          <button
            aria-label="Alerts"
            className="w-9.5 h-9.5 rounded-xl text-white/55 hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </button>

          {/* Teams / People Icon */}
          <button
            aria-label="Response Teams"
            className="w-9.5 h-9.5 rounded-xl text-white/55 hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
              />
            </svg>
          </button>

          {/* Drone Icon */}
          <button
            aria-label="Drone Surveillance"
            className="w-9.5 h-9.5 rounded-xl text-white/55 hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="12" cy="12" r="2.5" />
              <path d="M10 10L6.5 6.5M14 10l3.5-3.5M10 14l-3.5 3.5M14 14l3.5 3.5" />
              <circle cx="5" cy="5" r="2" />
              <circle cx="19" cy="5" r="2" />
              <circle cx="5" cy="19" r="2" />
              <circle cx="19" cy="19" r="2" />
            </svg>
          </button>

          {/* Incidents List Icon */}
          <button
            aria-label="Incident List"
            className="w-9.5 h-9.5 rounded-xl text-white/55 hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 17.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
          </button>

          {/* Settings Icon */}
          <button
            aria-label="Settings"
            className="w-9.5 h-9.5 rounded-xl text-white/55 hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </aside>

        {/* Center-Left Content Area */}
        <main className="flex-1 p-5 lg:p-7 flex flex-col justify-between overflow-y-auto z-10 max-w-[1440px]">
          {/* Top Hero Section */}
          <div className="space-y-3 max-w-xl">
            {/* Tagline */}
            <p className="text-[10px] tracking-[0.25em] font-semibold text-white/50 uppercase">
              PREPARE. RESPOND. RECOVER.
            </p>

            {/* Main Heading */}
            <div className="space-y-0.5">
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black text-white tracking-tight leading-[1.05]">
                Disaster
              </h1>
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black tracking-tight leading-[1.05] text-[#FF8577]">
                Management
              </h1>
            </div>

            {/* Subtext */}
            <p className="text-xs sm:text-[13px] text-white/70 max-w-md font-normal leading-relaxed pt-1">
              Real-time information, faster response,
              <br />
              safer communities.
            </p>

            {/* 4 Quick Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2.5 max-w-lg">
              {/* Stat 1: Active Incidents */}
              <div className="bg-[#0C121E]/65 border border-white/10 rounded-2xl p-3 backdrop-blur-xl shadow-lg hover:border-white/20 transition-all flex flex-col justify-between h-[92px]">
                <div className="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold text-white tracking-tight">12</span>
                    <span className="text-[10px] text-red-400 font-semibold flex items-center">
                      ↑ +4%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-white/55 font-medium mt-0.5">
                    <span>Active Incidents</span>
                    <svg className="w-2.5 h-2.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Stat 2: People Affected */}
              <div className="bg-[#0C121E]/65 border border-white/10 rounded-2xl p-3 backdrop-blur-xl shadow-lg hover:border-white/20 transition-all flex flex-col justify-between h-[92px]">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold text-white tracking-tight">12.4K</span>
                    <span className="text-[10px] text-red-400 font-semibold">+28%</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-white/55 font-medium mt-0.5">
                    <span>People Affected</span>
                    <svg className="w-2.5 h-2.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Stat 3: Active Shelters */}
              <div className="bg-[#0C121E]/65 border border-white/10 rounded-2xl p-3 backdrop-blur-xl shadow-lg hover:border-white/20 transition-all flex flex-col justify-between h-[92px]">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                    />
                  </svg>
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold text-white tracking-tight">48</span>
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center">
                      ↑ -12%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-white/55 font-medium mt-0.5">
                    <span>Active Shelters</span>
                    <svg className="w-2.5 h-2.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Stat 4: Response Teams */}
              <div className="bg-[#0C121E]/65 border border-white/10 rounded-2xl p-3 backdrop-blur-xl shadow-lg hover:border-white/20 transition-all flex flex-col justify-between h-[92px]">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  {/* Helicopter Icon */}
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 6h18M12 6v3M10 9h4c3 0 5 1.5 5 4.5S17 17 13 17H8c-2.5 0-4-1.5-4-3.5S5.5 9 8 9h2M7 17v2m8-2v2M5 19h12" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-baseline">
                    <span className="text-lg font-bold text-white tracking-tight">6</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-white/55 font-medium mt-0.5">
                    <span>Response Teams</span>
                    <svg className="w-2.5 h-2.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Dual Panels: Ongoing Incidents & Live Impact Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end pt-5">
            {/* Left Card: Ongoing Incidents (5 Cols) */}
            <div className="lg:col-span-5 bg-[#0C121E]/75 border border-white/10 rounded-2xl p-4 backdrop-blur-2xl shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <h2 className="text-xs sm:text-sm font-semibold tracking-tight text-white">
                  Ongoing Incidents
                </h2>
                <Link
                  href="/incidents"
                  className="text-[11px] text-white/60 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <span>View All</span>
                  <span className="text-xs">&rarr;</span>
                </Link>
              </div>

              {/* Incidents List */}
              <div className="space-y-3 pt-3">
                {/* Incident 1: Wildfire Spreading */}
                <div className="flex items-center justify-between gap-3 group cursor-pointer hover:bg-white/5 p-1 rounded-xl transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src="/assets/thumb_wildfire.png"
                      alt="Wildfire"
                      className="w-12 h-9 rounded-lg object-cover border border-white/10 shrink-0 shadow-sm"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] shadow-[0_0_6px_#EF4444] shrink-0" />
                        <h3 className="text-xs font-semibold text-white truncate">
                          Wildfire Spreading
                        </h3>
                      </div>
                      <p className="text-[10px] text-white/50 truncate mt-0.5">
                        32 min ago &bull; Northern Ridge, Hill District
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#EF4444]/20 text-[#F87171] border border-[#EF4444]/40">
                      High
                    </span>
                    <svg
                      className="w-3 h-3 text-white/35 group-hover:text-white transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* Incident 2: Flood Risk */}
                <div className="flex items-center justify-between gap-3 group cursor-pointer hover:bg-white/5 p-1 rounded-xl transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src="/assets/thumb_flood.png"
                      alt="Flood Risk"
                      className="w-12 h-9 rounded-lg object-cover border border-white/10 shrink-0 shadow-sm"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] shadow-[0_0_6px_#3B82F6] shrink-0" />
                        <h3 className="text-xs font-semibold text-white truncate">
                          Flood Risk
                        </h3>
                      </div>
                      <p className="text-[10px] text-white/50 truncate mt-0.5">
                        1 hour ago &bull; Riverside County
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/40">
                      Moderate
                    </span>
                    <svg
                      className="w-3 h-3 text-white/35 group-hover:text-white transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* Incident 3: Landslide Alert */}
                <div className="flex items-center justify-between gap-3 group cursor-pointer hover:bg-white/5 p-1 rounded-xl transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src="/assets/thumb_landslide.png"
                      alt="Landslide Alert"
                      className="w-12 h-9 rounded-lg object-cover border border-white/10 shrink-0 shadow-sm"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shadow-[0_0_6px_#F59E0B] shrink-0" />
                        <h3 className="text-xs font-semibold text-white truncate">
                          Landslide Alert
                        </h3>
                      </div>
                      <p className="text-[10px] text-white/50 truncate mt-0.5">
                        2 hours ago &bull; NH-13, Mountain Pass
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F59E0B]/20 text-[#FBBF24] border border-[#F59E0B]/40">
                      Moderate
                    </span>
                    <svg
                      className="w-3 h-3 text-white/35 group-hover:text-white transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card: Live Impact Overview (7 Cols) */}
            <div className="lg:col-span-7 bg-[#0C121E]/75 border border-white/10 rounded-2xl p-4 backdrop-blur-2xl shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <h2 className="text-xs sm:text-sm font-semibold tracking-tight text-white">
                  Live Impact Overview
                </h2>
                <div className="relative">
                  <button
                    onClick={() => setTodayDropdownOpen(!todayDropdownOpen)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-white/10 border border-white/10 text-white hover:bg-white/15 transition-colors"
                  >
                    <span>Today</span>
                    <svg
                      className="w-3 h-3 text-white/70"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 3 Overview Sub-Cards with Glowing Bar Charts */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                {/* 1. People Affected */}
                <div className="bg-[#121A2A]/70 border border-white/10 rounded-xl p-3 flex flex-col justify-between h-[124px]">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-base font-bold text-white tracking-tight leading-none block">
                        12.4K
                      </span>
                      <span className="text-[10px] text-white/55 font-medium leading-tight block mt-0.5">
                        People Affected
                      </span>
                    </div>
                  </div>

                  {/* Blue Glowing Wave/Bar Graphic */}
                  <div className="flex items-end justify-between gap-1 h-8 pt-1 px-0.5">
                    {[6, 10, 16, 22, 14, 18, 26, 20, 24, 18, 14, 22, 16, 10].map((h, i) => (
                      <span
                        key={i}
                        style={{ height: `${h}px` }}
                        className="w-1.5 rounded-full bg-[#38BDF8] shadow-[0_0_8px_rgba(56,189,248,0.7)]"
                      />
                    ))}
                  </div>
                </div>

                {/* 2. In Safe Shelters */}
                <div className="bg-[#121A2A]/70 border border-white/10 rounded-xl p-3 flex flex-col justify-between h-[124px]">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-base font-bold text-white tracking-tight leading-none block">
                        8.2K
                      </span>
                      <span className="text-[10px] text-white/55 font-medium leading-tight block mt-0.5">
                        In Safe Shelters
                      </span>
                    </div>
                  </div>

                  {/* Green Glowing Wave/Bar Graphic */}
                  <div className="flex items-end justify-between gap-1 h-8 pt-1 px-0.5">
                    {[8, 14, 20, 12, 22, 18, 26, 16, 22, 18, 24, 18, 14, 18].map((h, i) => (
                      <span
                        key={i}
                        style={{ height: `${h}px` }}
                        className="w-1.5 rounded-full bg-[#34D399] shadow-[0_0_8px_rgba(52,211,153,0.7)]"
                      />
                    ))}
                  </div>
                </div>

                {/* 3. Critical Areas */}
                <div className="bg-[#121A2A]/70 border border-white/10 rounded-xl p-3 flex flex-col justify-between h-[124px]">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-base font-bold text-white tracking-tight leading-none block">
                        3
                      </span>
                      <span className="text-[10px] text-white/55 font-medium leading-tight block mt-0.5">
                        Critical Areas
                      </span>
                    </div>
                  </div>

                  {/* Red Glowing Wave/Bar Graphic */}
                  <div className="flex items-end justify-between gap-1 h-8 pt-1 px-0.5">
                    {[14, 22, 16, 24, 18, 14, 22, 26, 18, 16, 22, 14, 18, 12].map((h, i) => (
                      <span
                        key={i}
                        style={{ height: `${h}px` }}
                        className="w-1.5 rounded-full bg-[#F87171] shadow-[0_0_8px_rgba(248,113,113,0.7)]"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* 4. Interactive Floating Map Cards on the Right */}
      {/* Wildfire Floating Marker Card */}
      <div className="hidden lg:flex absolute top-[15%] right-[22%] z-20 items-center gap-3 bg-[#0C121E]/85 border border-white/20 rounded-2xl p-3 backdrop-blur-xl shadow-[0_12px_32px_rgba(0,0,0,0.6)] hover:scale-105 transition-transform cursor-pointer">
        <div className="w-9 h-9 rounded-xl bg-red-500/25 border border-red-500/40 text-red-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.45)]">
          {/* Solid Flame Icon */}
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M12.87 2.15c-.46-.37-1.12-.22-1.38.3-.77 1.54-1.8 2.92-3.05 4.09-1.92 1.8-3.44 4.07-3.44 6.84 0 4.19 3.4 7.62 7.6 7.62s7.6-3.43 7.6-7.62c0-2.31-1.07-4.43-2.61-6.07-.37-.39-.99-.39-1.37 0-.33.34-.48.82-.39 1.28.3 1.5-.1 3.03-1.09 4.14-.19.21-.49.3-.76.23-.27-.07-.48-.28-.55-.55-.49-1.94-.09-3.98 1.05-5.59.34-.48.24-1.14-.24-1.5-.47-.36-1.13-.24-1.5.24-1.46 2.05-1.97 4.66-1.35 7.15.14.56-.25 1.1-.81 1.15-.5.04-.96-.32-1.04-.82-.6-3.8 1.05-7.58 2.83-10.88.25-.47.16-1.05-.25-1.4z" />
          </svg>
        </div>
        <div className="min-w-[140px]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-tight">Wildfire</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[#EF4444]/25 text-[#FCA5A5] border border-[#EF4444]/50">
              High Risk
            </span>
            <svg className="w-3 h-3 text-white/50 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="text-[10px] text-white/70 mt-0.5 font-medium">Spreading rapidly</p>
          <p className="text-[10px] text-white/45 font-mono">320 ha affected</p>
        </div>
      </div>

      {/* Flood Risk Floating Marker Card */}
      <div className="hidden lg:flex absolute bottom-[27%] right-[5%] z-20 items-center gap-3 bg-[#0C121E]/85 border border-white/20 rounded-2xl p-3 backdrop-blur-xl shadow-[0_12px_32px_rgba(0,0,0,0.6)] hover:scale-105 transition-transform cursor-pointer">
        <div className="w-9 h-9 rounded-xl bg-blue-500/25 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.45)]">
          {/* Waves / Water Icon */}
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9c1.5 0 2.25.75 3.75.75s2.25-.75 3.75-.75 2.25.75 3.75.75 2.25-.75 3.75-.75 2.25.75 3.75.75M3.75 15c1.5 0 2.25.75 3.75.75s2.25-.75 3.75-.75 2.25.75 3.75.75 2.25-.75 3.75-.75 2.25.75 3.75.75" />
          </svg>
        </div>
        <div className="min-w-[155px]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-tight">Flood Risk</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[#3B82F6]/25 text-[#93C5FD] border border-[#3B82F6]/50">
              Moderate
            </span>
            <svg className="w-3 h-3 text-white/50 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="text-[10px] text-white/70 mt-0.5 font-medium">River level 76%</p>
          <p className="text-[10px] text-white/45 font-mono">Possible flooding in 6 hours</p>
        </div>
      </div>
    </div>
  );
}
