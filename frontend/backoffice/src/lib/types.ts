// Types alignés sur le MCD (cf. frontend/mcd_catl_wms_svg.html)

export type StorageZoneType =
  | "ambient"
  | "fresh"
  | "cold"
  | "freezer"
  | "dry"
  | "preparation";

export type StockItemStatus =
  | "received"
  | "quality_ko"
  | "destroyed"
  | "in_stock"
  | "xdock"
  | "picked"
  | "shipped";

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
  | "ready"
  | "shipped"
  | "cancelled";

export type ActionType =
  // zones / locations
  | "zone_created"
  | "zone_updated"
  | "zone_deleted"
  | "location_created"
  | "location_updated"
  | "location_deleted"
  // flux produit (cf. diagramme de séquence frontend/image.webp)
  | "reception_started"
  | "quality_check_passed"
  | "quality_check_failed"
  | "product_destroyed"
  | "reception_scanned"
  | "xdock_deposited"
  | "xdock_scanned"
  | "stock_location_assigned"
  | "rack_deposited"
  | "rack_scanned"
  // mouvements
  | "stock_adjusted"
  | "stock_picked"
  | "stock_transferred";

export interface StorageZone {
  id: string;
  name: string;
  type: StorageZoneType;
  targetTemp: number;
  tempMin: number;
  tempMax: number;
  locationsCount?: number;
}

export interface StorageLocation {
  id: string;
  label: string;
  rack: string;
  position: string;
  temperature: number | null;
  zoneId: string;
}

export interface Producer {
  id: string;
  name: string;
  contact: string;
  address: string;
  province: string;
  isBio: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  ean: string | null;
  unit: StockItemUnit;
  storageType: StorageZoneType;
  isBio: boolean;
  certification: string | null;
  producerId: string;
}

export interface ReceptionRequest {
  ean?: string;
  lotNumber?: string;
  productId?: string;
  quantity: number;
  unit: StockItemUnit;
  weightDecl?: number;
  weightAct?: number;
  receptionTemp?: number;
  expirationDate?: string;
  bestBefore?: string;
  qualityOk: boolean;
  statusReason?: string;
  routing: "stock" | "xdock";
  locationId?: string;
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
