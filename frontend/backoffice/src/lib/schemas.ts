import { z } from "zod";
import type { StorageZoneType } from "./types";

const ZONE_TYPES = [
  "ambient",
  "fresh",
  "cold",
  "freezer",
  "dry",
  "preparation",
] as const;

/**
 * Valeurs par défaut de température (°C) par type de zone, alignées sur les
 * recommandations AFSCA / guide sectoriel circuit court (ordre de grandeur) :
 *   - ambient     : ambiant non spécifié
 *   - fresh       : réfrigéré 0–7 °C (fruits/légumes coupés, laitiers)
 *   - cold        : froid strict 0–4 °C (viande, poissonnerie)
 *   - freezer     : congelé ≤ -18 °C
 *   - dry         : sec / stable (céréales, conserves)
 *   - preparation : zone tampon de préparation, refroidie modérément
 */
export const DEFAULTS_BY_TYPE: Record<
  StorageZoneType,
  { targetTemp: number; tempMin: number; tempMax: number }
> = {
  ambient: { targetTemp: 15, tempMin: 10, tempMax: 25 },
  fresh: { targetTemp: 4, tempMin: 0, tempMax: 7 },
  cold: { targetTemp: 2, tempMin: 0, tempMax: 4 },
  freezer: { targetTemp: -20, tempMin: -25, tempMax: -18 },
  dry: { targetTemp: 18, tempMin: 10, tempMax: 25 },
  preparation: { targetTemp: 12, tempMin: 8, tempMax: 18 },
};

export const zoneFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Au moins 2 caractères")
      .max(80, "80 caractères max"),
    type: z.enum(ZONE_TYPES),
    targetTemp: z.coerce
      .number({ message: "Température cible requise" })
      .min(-40, "Trop bas")
      .max(60, "Trop haut"),
    tempMin: z.coerce
      .number({ message: "Min requis" })
      .min(-40, "Trop bas")
      .max(60, "Trop haut"),
    tempMax: z.coerce
      .number({ message: "Max requis" })
      .min(-40, "Trop bas")
      .max(60, "Trop haut"),
    areaM2: z.coerce
      .number({ message: "Surface requise" })
      .positive("La surface doit être positive")
      .max(100000, "Valeur invraisemblable"),
  })
  .refine((d) => d.tempMin < d.tempMax, {
    message: "Min doit être strictement inférieur au Max",
    path: ["tempMin"],
  })
  .refine((d) => d.targetTemp >= d.tempMin && d.targetTemp <= d.tempMax, {
    message: "La cible doit être comprise entre Min et Max",
    path: ["targetTemp"],
  });

export type ZoneFormInput = z.input<typeof zoneFormSchema>;
export type ZoneFormValues = z.output<typeof zoneFormSchema>;

export const locationFormSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Libellé requis")
    .max(80, "80 caractères max"),
  rack: z.string().trim().min(1, "Rack requis").max(20),
  position: z.string().trim().min(1, "Position requise").max(20),
  temperature: z
    .union([
      z.coerce.number().min(-40).max(60),
      z.literal("").transform(() => null),
    ])
    .nullable()
    .optional(),
});

export type LocationFormInput = z.input<typeof locationFormSchema>;
export type LocationFormValues = z.output<typeof locationFormSchema>;
