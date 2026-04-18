import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import {
  normalizeStorageLocation,
  normalizeStorageZone,
} from "@/lib/api-normalizers";
import type { ReceptionFormValues } from "@/lib/schemas";
import type {
  ReceptionResponse,
  StorageLocation,
  StorageZone,
  StorageZoneType,
} from "@/lib/types";

const availableLocationsKey = (storageType: StorageZoneType | undefined) =>
  ["storage-locations", "available", storageType ?? "all"] as const;

type RawStockItem = { id: string; locationId?: string; location_id?: string };

async function fetchZonesByType(
  storageType: StorageZoneType,
): Promise<StorageZone[]> {
  try {
    const raw = await api.get<Parameters<typeof normalizeStorageZone>[0][]>(
      "/api/wms/storage-zones/types",
      { types: storageType },
    );
    return (raw ?? []).map((z) => normalizeStorageZone(z, 0));
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return [];
    throw err;
  }
}

async function fetchLocationsForZone(
  zoneId: string,
): Promise<StorageLocation[]> {
  try {
    const raw = await api.get<
      Parameters<typeof normalizeStorageLocation>[0][]
    >(`/api/wms/storage-locations/zone/${zoneId}`);
    return (raw ?? []).map(normalizeStorageLocation);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return [];
    throw err;
  }
}

async function fetchOccupiedLocationIds(): Promise<Set<string>> {
  try {
    const page = await api.get<unknown>("/api/wms/stock-items/search", {
      status: "AVAILABLE",
      size: 1000,
      page: 0,
    });
    const list: RawStockItem[] = Array.isArray(page)
      ? (page as RawStockItem[])
      : (((page as { content?: RawStockItem[] })?.content) ?? []);
    const ids = new Set<string>();
    for (const si of list) {
      const id = si.locationId ?? si.location_id;
      if (id) ids.add(id);
    }
    return ids;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return new Set();
    throw err;
  }
}

export function useAvailableLocations(
  storageType: StorageZoneType | undefined,
) {
  return useQuery({
    queryKey: availableLocationsKey(storageType),
    queryFn: async (): Promise<StorageLocation[]> => {
      if (!storageType) return [];
      const zones = await fetchZonesByType(storageType);
      if (zones.length === 0) return [];
      const [locationsPerZone, occupied] = await Promise.all([
        Promise.all(zones.map((z) => fetchLocationsForZone(z.id))),
        fetchOccupiedLocationIds(),
      ]);
      const flat = locationsPerZone.flat();
      return flat.filter((l) => !occupied.has(l.id));
    },
    enabled: !!storageType,
    staleTime: 15_000,
  });
}

type StockItemPayload = {
  productId: string;
  locationId: string;
  cooperativeId: string;
  lotNumber: string;
  quantity: number;
  unit: string;
  weightDeclared?: number;
  weightActual?: number;
  receptionDate: string;
  expirationDate?: string;
  bestBefore?: string;
  status: "AVAILABLE" | "BLOCKED";
  statusReason?: string;
  receptionTemp?: number;
};

type StockItemResponse = {
  id: string;
  status: "AVAILABLE" | "RESERVED" | "BLOCKED" | "CONSUMED";
  locationId?: string;
  location_id?: string;
};

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useReception(cooperativeId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      values: ReceptionFormValues,
    ): Promise<ReceptionResponse> => {
      if (!cooperativeId) {
        throw new ApiError(
          409,
          "Aucune coopérative disponible. Crée-en une via POST /api/cooperatives avant de réceptionner.",
          null,
        );
      }
      if (!values.locationId) {
        throw new ApiError(
          400,
          "Emplacement requis — y compris en cas de rejet qualité (contrainte stock_item.location_id NOT NULL).",
          null,
        );
      }

      const payload: StockItemPayload = {
        productId: values.productId,
        locationId: values.locationId,
        cooperativeId,
        lotNumber: values.lotNumber,
        quantity: values.quantity,
        unit: values.unit,
        weightDeclared: values.weightDeclared,
        weightActual: values.weightActual,
        receptionDate: isoToday(),
        expirationDate: values.expirationDate,
        bestBefore: values.bestBefore,
        status: values.qualityOk ? "AVAILABLE" : "BLOCKED",
        statusReason: values.qualityOk ? undefined : values.statusReason,
        receptionTemp: values.receptionTemp,
      };

      const created = await api.post<StockItemResponse>(
        "/api/wms/stock-items",
        payload,
      );

      // Recharge l'emplacement pour pouvoir l'afficher dans l'écran de succès.
      let location: StorageLocation | null = null;
      if (created.status === "AVAILABLE") {
        try {
          const raw = await api.get<
            Parameters<typeof normalizeStorageLocation>[0]
          >(`/api/wms/storage-locations/${values.locationId}`);
          location = normalizeStorageLocation(raw);
        } catch {
          location = null;
        }
      }

      return {
        stockItemId: created.id,
        status: created.status,
        location,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["storage-locations", "available"] });
      qc.invalidateQueries({ queryKey: ["stock-items"] });
    },
  });
}
