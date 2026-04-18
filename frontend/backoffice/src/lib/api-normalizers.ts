import type {
  Producer,
  Product,
  StockItem,
  StorageLocation,
  StorageZone,
  StorageZoneType,
} from "@/lib/types";

// Le back expose des DTO avec typos / snake_case (ProductDto.is_bia, zone_id…).
// On normalise ici pour ne pas polluer le reste du front.

type RawProduct = {
  id: string;
  name: string;
  category?: string | null;
  ean?: string | null;
  unit: string;
  storageType?: StorageZoneType | null;
  storage_type?: StorageZoneType | null;
  isBio?: boolean;
  is_bio?: boolean;
  is_bia?: boolean;
  certification?: string | null;
  producerId?: string;
  producer_id?: string;
};

export function normalizeProduct(raw: RawProduct): Product {
  return {
    id: raw.id,
    name: raw.name,
    category: raw.category ?? null,
    ean: raw.ean ?? null,
    unit: raw.unit,
    storageType: (raw.storageType ?? raw.storage_type ?? null) as
      | StorageZoneType
      | null,
    isBio: raw.isBio ?? raw.is_bio ?? raw.is_bia ?? false,
    certification: raw.certification ?? null,
    producerId: (raw.producerId ?? raw.producer_id ?? "") as string,
  };
}

export function denormalizeProduct(
  p: Omit<Product, "id">,
): Record<string, unknown> {
  return {
    name: p.name,
    category: p.category,
    ean: p.ean,
    unit: p.unit,
    storageType: p.storageType,
    storage_type: p.storageType,
    isBio: p.isBio,
    is_bio: p.isBio,
    is_bia: p.isBio,
    certification: p.certification,
    producerId: p.producerId,
    producer_id: p.producerId,
  };
}

type RawLocation = {
  id: string;
  label: string;
  rack: string | null;
  position: string | null;
  temperature: number | string | null;
  zoneId?: string;
  zone_id?: string;
};

export function normalizeStorageLocation(raw: RawLocation): StorageLocation {
  const tempRaw = raw.temperature;
  const temperature =
    tempRaw === null || tempRaw === undefined || tempRaw === ""
      ? null
      : typeof tempRaw === "string"
        ? Number(tempRaw)
        : tempRaw;
  return {
    id: raw.id,
    label: raw.label,
    rack: raw.rack,
    position: raw.position,
    temperature: Number.isFinite(temperature as number)
      ? (temperature as number)
      : null,
    zoneId: (raw.zoneId ?? raw.zone_id ?? "") as string,
  };
}

type RawZone = {
  id: string;
  name: string;
  type: StorageZoneType;
  targetTemp: number | null;
  tempMin: number | null;
  tempMax: number | null;
  locationsCount?: number;
};

export function normalizeStorageZone(
  raw: RawZone,
  locationsCount = 0,
): StorageZone {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    targetTemp: raw.targetTemp ?? null,
    tempMin: raw.tempMin ?? null,
    tempMax: raw.tempMax ?? null,
    locationsCount: raw.locationsCount ?? locationsCount,
  };
}

type RawProducer = {
  id: string;
  name: string;
  contact: string | null;
  address: string | null;
  province: string | null;
  isBio?: boolean;
  is_bio?: boolean;
};

export function normalizeProducer(raw: RawProducer): Producer {
  return {
    id: raw.id,
    name: raw.name,
    contact: raw.contact ?? null,
    address: raw.address ?? null,
    province: raw.province ?? null,
    isBio: raw.isBio ?? raw.is_bio ?? false,
  };
}

type RawStockItem = {
  id: string;
  productId: string;
  locationId: string;
  cooperativeId: string;
  lotNumber: string;
  quantity: number | string;
  unit: string;
  weightDeclared: number | string | null;
  weightActual: number | string | null;
  receptionDate: string | null;
  expirationDate: string | null;
  bestBefore: string | null;
  status: StockItem["status"];
  statusReason: string | null;
  receptionTemp: number | string | null;
};

function toNumberOrNull(v: number | string | null): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

export function normalizeStockItem(raw: RawStockItem): StockItem {
  return {
    id: raw.id,
    productId: raw.productId,
    locationId: raw.locationId,
    cooperativeId: raw.cooperativeId,
    lotNumber: raw.lotNumber,
    quantity: toNumberOrNull(raw.quantity) ?? 0,
    unit: raw.unit,
    weightDeclared: toNumberOrNull(raw.weightDeclared),
    weightActual: toNumberOrNull(raw.weightActual),
    receptionDate: raw.receptionDate,
    expirationDate: raw.expirationDate,
    bestBefore: raw.bestBefore,
    status: raw.status,
    statusReason: raw.statusReason ?? null,
    receptionTemp: toNumberOrNull(raw.receptionTemp),
  };
}
