// Types simulateur — alignés sur l'OpenAPI officielle.
// On réexporte les schémas générés pour que le reste du code pointe sur
// un seul endroit stable.

import type { components } from "@/lib/apigen/types";

export type Producer = components["schemas"]["Producer"];
// tour-api n'expose que GET /producers (proxy vers wms-api). Les opérations
// d'écriture passent en direct par wms-api — cf. simulator/wms-client.ts.
export type ProducerUpdate = Omit<Producer, "id">;

export type Infrastructure = components["schemas"]["Infrastructure"];
export type InfrastructureUpdate =
  components["schemas"]["InfrastructureUpdate"];

export type Vehicle = components["schemas"]["Vehicle"];
export type VehicleCreate = components["schemas"]["VehicleCreate"];
export type VehicleUpdate = components["schemas"]["VehicleUpdate"];

export type VehicleTypeEnum = components["schemas"]["VehicleType"];
export type FuelType = components["schemas"]["FuelType"];
export type DriverType = components["schemas"]["DriverType"];
export type DayOfWeek = components["schemas"]["DayOfWeek"];
export type RouteStatus = components["schemas"]["RouteStatus"];
export type StopOperation = components["schemas"]["StopOperation"];

export type ApiRoute = components["schemas"]["Route"];
export type RouteDetail = components["schemas"]["RouteDetail"];
export type RouteCreate = components["schemas"]["RouteCreate"];
export type RouteUpdate = components["schemas"]["RouteUpdate"];
export type RoutePage = components["schemas"]["RoutePage"];
export type ApiStop = components["schemas"]["Stop"];
export type StopCreate = components["schemas"]["StopCreate"];
export type StopUpdate = components["schemas"]["StopUpdate"];

export type Customer = components["schemas"]["Customer"];
export type CustomerCreate = components["schemas"]["CustomerCreate"];
export type CustomerUpdate = components["schemas"]["CustomerUpdate"];
export type CustomerPage = components["schemas"]["CustomerPage"];
export type CustomerType = components["schemas"]["CustomerType"];

// Labels français pour les enums — l'UI doit traduire, le back reste en
// anglais comme dans l'OpenAPI.
export const VEHICLE_TYPE_LABELS: Record<VehicleTypeEnum, string> = {
  van: "Fourgon",
  light_truck: "Camion léger",
  heavy_truck: "Camion lourd",
};

export const FUEL_LABELS: Record<FuelType, string> = {
  diesel: "Diesel",
  gasoline: "Essence",
  cng: "GNV / Gaz",
  electric: "Électrique",
  hybrid: "Hybride",
};

export const DRIVER_LABELS: Record<DriverType, string> = {
  employee: "Salarié",
  owner: "Producteur·rice (soi-même)",
  external: "Prestataire extérieur",
};

export const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
};

export const STOP_OPERATION_LABELS: Record<StopOperation, string> = {
  delivery: "📦 Livraison",
  pickup: "🚜 Collecte",
  relay_point: "🏬 Point relais",
};

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  restaurant: "Restaurant",
  school: "École / cantine",
  csa: "AMAP / panier",
  shop: "Magasin",
  individual: "Particulier",
  pickup_point: "Point relais",
  other: "Autre",
};

// Liste des métiers / productions (conservée côté front, le back accepte
// des strings libres dans `Producer.trades[]`).
export const PRODUCTION_TYPES = [
  "Maraîchage",
  "Céréales panifiables",
  "Grandes cultures (céréales)",
  "Fruiticulture",
  "Bovins laitiers",
  "Ovins Laitiers",
  "Caprins Laitiers",
  "Viande Bovine",
  "Viande Ovine",
  "Viande porcine",
  "Cuniculture",
  "Aviculture viandes",
  "Aviculture oeufs",
  "Viande caprine",
  "Floriculture/Herboristerie",
  "Apiculture",
  "Aquaculture (poissons)",
  "Myciculture (Champignons)",
  "Héliciculture",
  "Arboriculture Forestière",
  "Autres",
] as const;

// Centre carte par défaut (Liège)
export const DEFAULT_MAP_CENTER: [number, number] = [50.6326, 5.5797];
export const DEFAULT_MAP_ZOOM = 11;
