import { z } from "zod";

// Schémas zod alignés sur l'OpenAPI (voir lib/apigen/types.ts)

const VEHICLE_TYPES = ["van", "light_truck", "heavy_truck"] as const;
const FUEL_TYPES = [
  "diesel",
  "gasoline",
  "cng",
  "electric",
  "hybrid",
] as const;
const DRIVER_TYPES = ["employee", "owner", "external"] as const;

export const producerFormSchema = z.object({
  name: z.string().trim().min(2, "Au moins 2 caractères").max(120),
  email: z.string().trim().email("Email invalide"),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  trades: z.array(z.string().trim().min(1)).default([]),
});

export type ProducerFormInput = z.input<typeof producerFormSchema>;
export type ProducerFormValues = z.output<typeof producerFormSchema>;

export const infrastructureFormSchema = z.object({
  drySurfaceM2: z.coerce.number().int().min(0).max(5000),
  freshSurfaceM2: z.coerce.number().int().min(0).max(5000),
  frozenSurfaceM2: z.coerce.number().int().min(0).max(5000),
  prepSurfaceM2: z.coerce.number().int().min(0).max(5000),
});

export type InfrastructureFormInput = z.input<typeof infrastructureFormSchema>;
export type InfrastructureFormValues = z.output<typeof infrastructureFormSchema>;

export const vehicleFormSchema = z.object({
  type: z.enum(VEHICLE_TYPES),
  fuel: z.enum(FUEL_TYPES),
  refrigerated: z.boolean().default(false),
  driverType: z.enum(DRIVER_TYPES),
  consumptionL100Km: z.coerce.number().min(0).max(100),
  fuelPrice: z.coerce.number().min(0).max(100),
  amortizationEurKm: z.coerce.number().min(0).max(10),
  hourlyCost: z.coerce.number().min(0).max(500),
  prepTimeMin: z.coerce.number().int().min(0).max(600),
  loadingTimeMin: z.coerce.number().int().min(0).max(600),
});

export type VehicleFormInput = z.input<typeof vehicleFormSchema>;
export type VehicleFormValues = z.output<typeof vehicleFormSchema>;
