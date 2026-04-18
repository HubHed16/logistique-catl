import { z } from "zod";

const ZONE_TYPES = [
  "ambient",
  "fresh",
  "cold",
  "freezer",
  "dry",
  "preparation",
] as const;

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
