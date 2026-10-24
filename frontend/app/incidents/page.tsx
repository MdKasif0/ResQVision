"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppShell, Button, EmptyState, Panel } from "@/components";
import type { IncidentListItem } from "@/lib/types";

export default function IncidentsPage() {
  // Real incidents state: empty by default (no fake records)
  const [incidents] = useState<IncidentListItem[]>([]);

  return (
    <AppShell>
      <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-semibold tracking-tight text-[#1F1D1A]">
            Incident Records
          </h1>
          <p className="text-xs text-[#6B665C] mt-1 leading-relaxed">
            Historical registry of vision detections, extracted scene features, and LLM triage assessments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="primary" size="md">
              Start New Analysis
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary Records Panel */}
      <Panel
        title="Session Incident Log"
        subtitle="Chronological list of evidentiary records"
        action={
          <span className="text-[11px] font-mono text-[#6B665C] bg-[#FAF8F4] px-2 py-0.5 rounded border border-[#E5E1D8]">
            0 Records
          </span>
        }
        bodyClassName="p-0"
      >
        {incidents.length === 0 ? (
          <div className="py-12 px-4">
            <EmptyState
              title="No incidents analyzed yet"
              description="No imagery has been processed in this session. Upload field imagery on the Analyze page to generate vision detections and schema-validated triage assessments."
              action={
                <Link href="/">
                  <Button variant="secondary" size="sm">
                    Go to Analyze Workflow
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5E1D8] bg-[#FAF8F4] text-[#6B665C] font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Urgency</th>
                  <th className="py-2.5 px-4">Persons Detected</th>
                  <th className="py-2.5 px-4">Executive Summary</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E1D8]">
                {/* Populated when real records exist */}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
