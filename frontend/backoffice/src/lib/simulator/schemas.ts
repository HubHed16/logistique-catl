import { z } from "zod";
import {
  DRIVER_TYPES,
  FUEL_TYPES,
  PRODUCTION_TYPES,
  VEHICLE_TYPES,
} from "./constants";

export const depotSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Au moins 2 caractères")
    .max(120, "120 caractères max"),
  mail: z
    .string()
    .trim()
    .email("Adresse email invalide")
    .or(z.literal(""))
    .optional(),
  addr: z
    .string()
    .trim()
    .min(4, "Adresse requise")
    .max(300, "300 caractères max"),
  lat: z
    .number({ message: "Latitude manquante" })
    .min(-90)
    .max(90),
  lon: z
    .number({ message: "Longitude manquante" })
    .min(-180)
    .max(180),
  jobs: z
    .array(z.enum(PRODUCTION_TYPES))
    .min(1, "Sélectionne au moins un métier"),

  // Véhicule
  vehType: z.enum(VEHICLE_TYPES),
  fuel: z.enum(FUEL_TYPES),
  vehCons: z.coerce.number().min(0).max(100),
  fuelPrice: z.coerce.number().min(0).max(100),
  vehAmort: z.coerce.number().min(0).max(10),
  vehFrigo: z.boolean(),

  // Organisation logistique
  driver: z.enum(DRIVER_TYPES),
  cH: z.coerce.number().min(0).max(500),
  tPrep: z.coerce.number().int().min(0).max(600),
  tLoad: z.coerce.number().int().min(0).max(600),

  // Infra (surfaces en m²)
  infraSec: z.coerce.number().int().min(0).max(2000),
  infraFrais: z.coerce.number().int().min(0).max(2000),
  infraNeg: z.coerce.number().int().min(0).max(2000),
  infraPrep: z.coerce.number().int().min(0).max(2000),
});

export type DepotFormInput = z.input<typeof depotSchema>;
export type DepotFormValues = z.output<typeof depotSchema>;
