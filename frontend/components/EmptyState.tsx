import React from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg p-8 sm:p-12 text-center max-w-xl mx-auto ${className}`}
    >
      <div className="flex flex-col items-center">
        {icon ? (
          <div className="w-10 h-10 rounded-md bg-[#FAF8F4] border border-[#E5E1D8] flex items-center justify-center text-[#6B665C] mb-4">
            {icon}
          </div>
        ) : (
          <div className="w-10 h-10 rounded-md bg-[#FAF8F4] border border-[#E5E1D8] flex items-center justify-center text-[#6B665C] mb-4">
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
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
        )}

        <h3 className="text-sm font-semibold text-[#1F1D1A] tracking-tight">
          {title}
        </h3>
        <p className="text-xs text-[#6B665C] mt-1.5 max-w-md leading-relaxed">
          {description}
        </p>

        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}
