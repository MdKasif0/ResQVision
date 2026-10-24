import React from "react";

export interface PanelProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  footer,
  className = "",
  bodyClassName = "p-4",
}: PanelProps) {
  const hasHeader = Boolean(title || subtitle || action);

  return (
    <section
      className={`bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg shadow-subtle overflow-hidden ${className}`}
    >
      {hasHeader ? (
        <header className="px-4 py-3 border-b border-[#E5E1D8] flex items-center justify-between gap-3 bg-[#FFFFFF]">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#1F1D1A]">
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p className="text-xs text-[#6B665C] mt-0.5 leading-normal">
                {subtitle}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}

      <div className={bodyClassName}>{children}</div>

      {footer ? (
        <footer className="px-4 py-2.5 border-t border-[#E5E1D8] bg-[#FAF8F4] text-xs text-[#6B665C]">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}
