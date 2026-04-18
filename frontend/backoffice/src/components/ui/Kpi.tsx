import type { ReactNode } from "react";

export function Kpi({
  label,
  value,
  icon,
  emphasis,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="bg-white rounded-md border border-gray-200 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-catl-text/70 font-semibold flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div
        className={`mt-0.5 font-bold ${
          emphasis ? "text-lg text-catl-accent" : "text-sm text-catl-primary"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
