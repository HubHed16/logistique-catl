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

// ─── Produit (création inline depuis la réception) ─────────────────────────

const STOCK_UNITS = [
  "kg",
  "piece",
  "liter",
  "bunch",
  "dozen",
  "box",
] as const;

export const productCreateSchema = z.object({
  name: z.string().trim().min(2, "Au moins 2 caractères").max(120),
  category: z.string().trim().min(2, "Catégorie requise").max(80),
  unit: z.enum(STOCK_UNITS),
  storageType: z.enum(ZONE_TYPES),
  producerId: z.string().min(1, "Producteur requis"),
  isBio: z.boolean(),
  certification: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v ? v : null))
    .nullable(),
  ean: z.string().trim().max(32).optional().nullable(),
});

export type ProductCreateInput = z.input<typeof productCreateSchema>;
export type ProductCreateValues = z.output<typeof productCreateSchema>;

// ─── Réception (wizard préparateur) ────────────────────────────────────────

export const receptionSchema = z
  .object({
    // Étape 1 — identification
    productId: z.string().min(1, "Produit requis"),
    ean: z.string().trim().optional(),
    lotNumber: z
      .string()
      .trim()
      .max(60)
      .optional()
      .transform((v) => (v ? v : undefined)),

    // Étape 2 — quantité & poids & T°
    quantity: z.coerce
      .number({ message: "Quantité requise" })
      .positive("Quantité strictement positive"),
    unit: z.enum(STOCK_UNITS),
    weightDecl: z
      .union([
        z.coerce.number().nonnegative(),
        z.literal("").transform(() => undefined),
      ])
      .optional(),
    weightAct: z
      .union([
        z.coerce.number().nonnegative(),
        z.literal("").transform(() => undefined),
      ])
      .optional(),
    receptionTemp: z
      .union([
        z.coerce.number().min(-40).max(60),
        z.literal("").transform(() => undefined),
      ])
      .optional(),

    // Étape 3 — dates
    expirationDate: z
      .string()
      .optional()
      .transform((v) => (v ? v : undefined)),
    bestBefore: z
      .string()
      .optional()
      .transform((v) => (v ? v : undefined)),

    // Étape 4 — qualité
    qualityOk: z.boolean(),
    statusReason: z
      .string()
      .trim()
      .max(300)
      .optional()
      .transform((v) => (v ? v : undefined)),

    // Étape 5 — routing
    routing: z.enum(["stock", "xdock"]),
    locationId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.expirationDate && !data.bestBefore) {
      ctx.addIssue({
        code: "custom",
        path: ["bestBefore"],
        message: "Au moins une date (DLC ou DDM) est requise",
      });
    }
    if (!data.qualityOk && !data.statusReason) {
      ctx.addIssue({
        code: "custom",
        path: ["statusReason"],
        message: "Motif requis si le contrôle est KO",
      });
    }
    if (data.qualityOk && data.routing === "stock" && !data.locationId) {
      ctx.addIssue({
        code: "custom",
        path: ["locationId"],
        message: "Emplacement requis pour un routage en stock",
      });
    }
  });

export type ReceptionFormInput = z.input<typeof receptionSchema>;
export type ReceptionFormValues = z.output<typeof receptionSchema>;
