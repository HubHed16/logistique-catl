import type { StorageZoneType } from "@/lib/types";

const STYLES: Record<
  StorageZoneType,
  { label: string; bg: string; text: string }
> = {
  ambient: {
    label: "Ambiant",
    bg: "bg-stone-100",
    text: "text-stone-700",
  },
  fresh: {
    label: "Frais",
    bg: "bg-sky-100",
    text: "text-sky-700",
  },
  cold: {
    label: "Froid",
    bg: "bg-blue-100",
    text: "text-blue-700",
  },
  freezer: {
    label: "Congélation",
    bg: "bg-indigo-100",
    text: "text-indigo-700",
  },
  dry: {
    label: "Sec",
    bg: "bg-amber-100",
    text: "text-amber-700",
  },
  preparation: {
    label: "Préparation",
    bg: "bg-purple-100",
    text: "text-purple-700",
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
  { value: "ambient", label: "Ambiant" },
  { value: "fresh", label: "Frais (0–7 °C)" },
  { value: "cold", label: "Froid" },
  { value: "freezer", label: "Congélation (≤ -18 °C)" },
  { value: "dry", label: "Sec" },
  { value: "preparation", label: "Préparation" },
];
