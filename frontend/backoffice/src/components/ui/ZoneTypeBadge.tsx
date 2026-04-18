import type { StorageZoneType } from "@/lib/types";

const STYLES: Record<
  StorageZoneType,
  { label: string; bg: string; text: string }
> = {
  ambient: {
    label: "Ambiant",
    bg: "bg-amber-100",
    text: "text-amber-700",
  },
  fresh: {
    label: "Frais",
    bg: "bg-sky-100",
    text: "text-sky-700",
  },
  negative: {
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
  { value: "ambient", label: "Ambiant (10–25 °C)" },
  { value: "fresh", label: "Frais (0–7 °C)" },
  { value: "negative", label: "Négatif (≤ -18 °C)" },
];
