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
const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
const STOP_OPERATIONS = ["delivery", "pickup", "relay_point"] as const;
const CUSTOMER_TYPES = [
  "restaurant",
  "school",
  "csa",
  "shop",
  "individual",
  "pickup_point",
  "other",
] as const;

// Schéma aligné sur la Producer DTO wms-api : contact, province, isBio —
// plus d'email, trades, ni lat/lon (ces dernières sont géocodées à la
// volée depuis `address` côté front pour l'affichage carte).
export const producerFormSchema = z.object({
  name: z.string().trim().min(2, "Au moins 2 caractères").max(120),
  contact: z.string().trim().max(200).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  province: z.string().trim().max(120).optional().or(z.literal("")),
  isBio: z.boolean().default(false),
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

// ─── Route ────────────────────────────────────────────────────────────────
// Dérive le jour de la semaine d'une date ISO (YYYY-MM-DD) sans dépendre du
// fuseau local (parse manuel pour éviter les décalages UTC de `new Date`).
export function dayOfWeekFromIsoDate(
  iso: string,
): (typeof DAYS_OF_WEEK)[number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [, y, mo, d] = m;
  const dt = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  if (Number.isNaN(dt.getTime())) return null;
  // getUTCDay: 0=dimanche..6=samedi → remappe lundi=0.
  const idx = (dt.getUTCDay() + 6) % 7;
  return DAYS_OF_WEEK[idx] ?? null;
}

// Le dayOfWeek est désormais dérivé de la date côté client avant envoi — pas
// de champ indépendant dans le formulaire.
export const routeFormSchema = z.object({
  name: z.string().trim().min(2, "Au moins 2 caractères").max(120),
  vehicleId: z.string().uuid().optional().or(z.literal("")),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD")
    .optional()
    .or(z.literal("")),
});

export type RouteFormInput = z.input<typeof routeFormSchema>;
export type RouteFormValues = z.output<typeof routeFormSchema>;

// ─── Stop ─────────────────────────────────────────────────────────────────
export const stopFormSchema = z
  .object({
    mode: z.enum(["customer", "address"]),
    customerId: z.string().uuid().optional().or(z.literal("")),
    address: z.string().trim().optional().or(z.literal("")),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    operation: z.enum(STOP_OPERATIONS),
    amountEur: z.coerce.number().min(0).max(1_000_000).default(0),
    durationMin: z.coerce.number().int().min(0).max(600).default(15),
  })
  .refine(
    (v) =>
      v.mode === "customer"
        ? !!v.customerId
        : typeof v.latitude === "number" && typeof v.longitude === "number",
    {
      message:
        "Sélectionne un client ou un point sur la carte (clic ou suggestion d'adresse).",
      path: ["address"],
    },
  );

export type StopFormInput = z.input<typeof stopFormSchema>;
export type StopFormValues = z.output<typeof stopFormSchema>;

// ─── Customer ─────────────────────────────────────────────────────────────
export const customerFormSchema = z.object({
  name: z.string().trim().min(2, "Au moins 2 caractères").max(160),
  type: z.enum(CUSTOMER_TYPES).optional().or(z.literal("")),
  address: z.string().trim().min(3, "Adresse requise"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  contactEmail: z.string().trim().email("Email invalide").optional().or(z.literal("")),
  contactPhone: z.string().trim().max(40).optional().or(z.literal("")),
  deliveryHours: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type CustomerFormInput = z.input<typeof customerFormSchema>;
export type CustomerFormValues = z.output<typeof customerFormSchema>;

// ─── Stop item (ligne produit d'un arrêt) ─────────────────────────────────
export const stopItemFormSchema = z.object({
  productId: z.string().uuid("Produit requis"),
  quantity: z.coerce.number().positive("Quantité > 0").max(1_000_000),
  unitPrice: z
    .union([
      z.coerce.number().min(0).max(1_000_000),
      z.literal("").transform(() => null),
    ])
    .nullable()
    .optional(),
});

export type StopItemFormInput = z.input<typeof stopItemFormSchema>;
export type StopItemFormValues = z.output<typeof stopItemFormSchema>;
