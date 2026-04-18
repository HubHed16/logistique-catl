// Données de référence reprises du simulateur legacy
// (frontend/backoffice/public/simulator/index.html)

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

export type ProductionType = (typeof PRODUCTION_TYPES)[number];

export const VEHICLE_TYPES = [
  "Petit utilitaire (< 3m³)",
  "Fourgon compact (3-6m³)",
  "Grand fourgon (6-12m³)",
  "Petit camion (12-20m³)",
  "Camion lourd (> 20m³)",
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const FUEL_TYPES = [
  "Diesel",
  "Essence",
  "Électrique",
  "GNV / Gaz",
  "Hybride",
] as const;

export type FuelType = (typeof FUEL_TYPES)[number];

export const DRIVER_TYPES = [
  "Producteur.rice (Soi-même)",
  "Salarié",
  "Prestataire Extérieur",
] as const;

export type DriverType = (typeof DRIVER_TYPES)[number];

export const TOUR_DAYS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
] as const;

export type TourDay = (typeof TOUR_DAYS)[number];

export const STOP_OP_TYPES = [
  { value: "📦", label: "📦 Livraison Client" },
  { value: "🚜", label: "🚜 Collecte" },
  { value: "🏬", label: "🏬 Point Relais" },
] as const;

export type StopOpType = (typeof STOP_OP_TYPES)[number]["value"];

// Centre par défaut de la carte : Liège
export const DEFAULT_MAP_CENTER: [number, number] = [50.6326, 5.5797];
export const DEFAULT_MAP_ZOOM = 11;

// Clé localStorage versionnée — à bumper à chaque changement de forme du state
export const SIMULATOR_STORAGE_KEY = "catl.simulator.v1";
