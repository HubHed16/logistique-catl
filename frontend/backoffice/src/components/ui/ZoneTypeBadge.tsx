import type { StorageZoneType } from "@/lib/types";

const STYLES: Record<
  StorageZoneType,
  { label: string; bg: string; text: string }
> = {
  DRY: {
    label: "Ambiant",
    bg: "bg-amber-100",
    text: "text-amber-700",
  },
  COLD: {
    label: "Frais",
    bg: "bg-sky-100",
    text: "text-sky-700",
  },
  FROZEN: {
    label: "Négatif",
    bg: "bg-indigo-100",
    text: "text-indigo-700",
  },
};

export function ZoneTypeBadge({ type }: { type: StorageZoneType }) {
  const s = STYLES[type];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}
    >
      {s.label}
    </span>
  );
}

export function zoneTypeLabel(type: StorageZoneType): string {
  return STYLES[type].label;
}

export const ZONE_TYPE_OPTIONS: { value: StorageZoneType; label: string }[] = [
  { value: "DRY", label: "Ambiant (10–25 °C)" },
  { value: "COLD", label: "Frais (0–7 °C)" },
  { value: "FROZEN", label: "Négatif (≤ -18 °C)" },
];
