// Types alignés sur le schéma SQL — source de vérité :
// backend/wms/src/main/resources/db/migration/V1.0__init_database.sql

export type StorageZoneType = "ambient" | "fresh" | "negative";

export type StockItemStatus = "available" | "reserved" | "blocked";

/**
 * Côté SQL `unit` est un VARCHAR libre. On fige une petite liste côté UI
 * pour la saisie, mais on garde `string` ailleurs pour ne pas contraindre
 * à tort ce que renvoie l'API.
 */
export type StockItemUnit =
  | "kg"
  | "piece"
  | "liter"
  | "bunch"
  | "dozen"
  | "box";

export type OrderStatus =
  | "draft"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled";

/**
 * Pas de table `action_log` côté SQL pour l'instant — ces valeurs vivent
 * côté mock / front uniquement, en attendant un journal officiel.
 */
export type ActionType =
  | "zone_created"
  | "zone_updated"
  | "zone_deleted"
  | "location_created"
  | "location_updated"
  | "location_deleted"
  | "reception_started"
  | "quality_check_passed"
  | "quality_check_failed"
  | "product_destroyed"
  | "reception_scanned"
  | "stock_location_assigned"
  | "rack_deposited"
  | "rack_scanned"
  | "stock_adjusted"
  | "stock_picked"
  | "stock_transferred";

export interface StorageZone {
  id: string;
  name: string;
  type: StorageZoneType;
  targetTemp: number | null;
  tempMin: number | null;
  tempMax: number | null;
  locationsCount?: number;
}

export interface StorageLocation {
  id: string;
  label: string;
  rack: string | null;
  position: string | null;
  temperature: number | null;
  zoneId: string;
}

export interface Producer {
  id: string;
  name: string;
  contact: string | null;
  address: string | null;
  province: string | null;
  isBio: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: string | null;
  ean: string | null;
  unit: string;
  storageType: StorageZoneType | null;
  isBio: boolean;
  certification: string | null;
  producerId: string;
}

export interface StockItem {
  id: string;
  productId: string;
  locationId: string; // NOT NULL en SQL — pas d'item sans emplacement
  cooperativeId: string;
  lotNumber: string;
  quantity: number;
  unit: string;
  weightDeclared: number | null;
  weightActual: number | null;
  receptionDate: string | null;
  expirationDate: string | null;
  bestBefore: string | null;
  status: StockItemStatus;
  statusReason: string | null;
  receptionTemp: number | null;
}

export interface ReceptionRequest {
  productId: string;
  ean?: string;
  lotNumber: string;
  quantity: number;
  unit: string;
  weightDeclared?: number;
  weightActual?: number;
  receptionTemp?: number;
  expirationDate?: string;
  bestBefore?: string;
  qualityOk: boolean;
  statusReason?: string;
  locationId?: string; // obligatoire si qualityOk=true (un stock_item sera créé)
}

export interface ReceptionResponse {
  stockItemId: string;
  status: StockItemStatus;
  location: StorageLocation | null;
}

export interface ActionLogEntry {
  id: string;
  actionType: ActionType;
  occurredAt: string;
  actorLabel: string | null;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown> | null;
  notes: string | null;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}
