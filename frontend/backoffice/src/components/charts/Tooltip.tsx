"use client";

import type { ReactNode } from "react";

export type CatlTooltipRow = {
  label: string;
  value: string;
  color?: string;
};

export function CatlTooltipCard({
  title,
  rows,
  footer,
}: {
  title?: string;
  rows: CatlTooltipRow[];
  footer?: ReactNode;
}) {
  return (
    <div className="bg-white rounded-md border border-gray-200 shadow-sm px-3 py-2 text-xs">
      {title && (
        <div className="font-bold text-catl-primary mb-1">{title}</div>
      )}
      <div className="space-y-0.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-catl-text">
              {r.color && (
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: r.color }}
                />
              )}
              {r.label}
            </span>
            <span className="font-semibold text-catl-primary">{r.value}</span>
          </div>
        ))}
      </div>
      {footer && (
        <div className="mt-1.5 pt-1.5 border-t border-gray-100 text-[11px] text-catl-text">
          {footer}
        </div>
      )}
    </div>
  );
}
