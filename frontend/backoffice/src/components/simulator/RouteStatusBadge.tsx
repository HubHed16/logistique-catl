import type { RouteStatus } from "@/lib/simulator/types";

const STATUS_STYLES: Record<RouteStatus, { label: string; className: string }> =
  {
    draft: {
      label: "Brouillon",
      className: "bg-amber-100 text-amber-900 border-amber-200",
    },
    validated: {
      label: "Validé",
      className: "bg-emerald-100 text-emerald-900 border-emerald-200",
    },
    completed: {
      label: "Terminé",
      className: "bg-sky-100 text-sky-900 border-sky-200",
    },
    cancelled: {
      label: "Annulé",
      className: "bg-gray-200 text-gray-700 border-gray-300",
    },
  };

export function RouteStatusBadge({ status }: { status: RouteStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${s.className}`}
    >
      {s.label}
    </span>
  );
}
