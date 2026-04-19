import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import {
  normalizeStorageLocation,
  normalizeStorageZone,
} from "@/lib/api-normalizers";
import type { StorageZone, StorageLocation } from "@/lib/types";
import type {
  LocationFormValues,
  ZoneFormValues,
} from "@/lib/schemas";

const ZONES_KEY = ["zones"] as const;
const ALL_LOCATIONS_KEY = ["storage-locations", "all"] as const;
const zoneKey = (id: string) => ["zones", id] as const;
const zoneLocationsKey = (zoneId: string) =>
  ["zones", zoneId, "locations"] as const;

// Zone de test figée côté front — le back ne supporte pas la création, donc on
// injecte une zone « par défaut » dans la liste pour que l'UI ait toujours
// quelque chose à afficher. L'ID reste stable pour ne pas casser les refs.
export const DEFAULT_TEST_ZONE_ID = "00000000-0000-0000-0000-00000000test";
const DEFAULT_TEST_ZONE: StorageZone = {
  id: DEFAULT_TEST_ZONE_ID,
  name: "Zone de test par défaut",
  type: "COLD",
  targetTemp: 4,
  tempMin: 0,
  tempMax: 7,
  locationsCount: 0,
};

// Page unique de 500 suffit pour le volume hackathon. Si on explose la taille,
// on repassera en pagination côté back.
async function fetchAllLocations(): Promise<StorageLocation[]> {
  const page = await api.get<unknown>("/api/wms/storage-locations", {
    size: 500,
    page: 0,
  });
  const list = Array.isArray(page) ? page : ((page as { content?: unknown[] })?.content ?? []);
  return (list as Array<Parameters<typeof normalizeStorageLocation>[0]>).map(
    normalizeStorageLocation,
  );
}

export function useAllLocations() {
  return useQuery({
    queryKey: ALL_LOCATIONS_KEY,
    queryFn: fetchAllLocations,
    staleTime: 30_000,
  });
}

export function useZones() {
  return useQuery({
    queryKey: ZONES_KEY,
    queryFn: async () => {
      const [zonesRaw, locations] = await Promise.all([
        api.get<Parameters<typeof normalizeStorageZone>[0][]>(
          "/api/wms/storage-zones",
          { size: 200, page: 0 },
        ),
        fetchAllLocations(),
      ]);
      const countByZone = new Map<string, number>();
      for (const l of locations) {
        countByZone.set(l.zoneId, (countByZone.get(l.zoneId) ?? 0) + 1);
      }
      const zones = (zonesRaw ?? []).map((z) =>
        normalizeStorageZone(z, countByZone.get(z.id) ?? 0),
      );
      return [DEFAULT_TEST_ZONE, ...zones];
    },
  });
}

export function useZone(id: string | undefined) {
  return useQuery({
    queryKey: id ? zoneKey(id) : ["zones", "missing"],
    queryFn: async () => {
      const [zoneRaw, locations] = await Promise.all([
        api.get<Parameters<typeof normalizeStorageZone>[0]>(
          `/api/wms/storage-zones/${id}`,
        ),
        api
          .get<Parameters<typeof normalizeStorageLocation>[0][]>(
            `/api/wms/storage-locations/zone/${id}`,
          )
          .catch((err) => {
            // 204 no-content est renvoyé en array vide par le back — on gère
            // aussi l'absence silencieuse.
            if (err instanceof ApiError && err.status === 404) return [];
            throw err;
          }),
      ]);
      return normalizeStorageZone(zoneRaw, (locations ?? []).length);
    },
    enabled: !!id,
  });
}

export function useZoneLocations(zoneId: string | undefined) {
  return useQuery({
    queryKey: zoneId ? zoneLocationsKey(zoneId) : ["zones", "locations", "missing"],
    queryFn: async () => {
      const raw = await api.get<
        Parameters<typeof normalizeStorageLocation>[0][]
      >(`/api/wms/storage-locations/zone/${zoneId}`);
      return (raw ?? []).map(normalizeStorageLocation);
    },
    enabled: !!zoneId,
  });
}

// Le back n'expose PAS de POST /api/storage-zones. On signale clairement la
// limite plutôt que d'émettre une requête qui finira en 405.
export function useCreateZone() {
  return useMutation({
    mutationFn: async (_values: ZoneFormValues): Promise<StorageZone> => {
      throw new ApiError(
        501,
        "La création de zone n'est pas exposée par le back actuel. Demande à l'équipe back d'ajouter POST /api/storage-zones.",
        null,
      );
    },
  });
}

export function useUpdateZone(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: ZoneFormValues) => {
      const raw = await api.patch<Parameters<typeof normalizeStorageZone>[0]>(
        `/api/wms/storage-zones/${id}`,
        values,
      );
      return normalizeStorageZone(raw);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ZONES_KEY });
      qc.invalidateQueries({ queryKey: zoneKey(id) });
    },
  });
}

export function useDeleteZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<void>(`/api/wms/storage-zones/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ZONES_KEY });
    },
  });
}

export function useCreateLocation(_zoneId: string) {
  return useMutation({
    mutationFn: async (_values: LocationFormValues): Promise<StorageLocation> => {
      throw new ApiError(
        501,
        "La création d'emplacement n'est pas exposée par le back actuel. Demande à l'équipe back d'ajouter POST /api/storage-locations.",
        null,
      );
    },
  });
}

export function useUpdateLocation(zoneId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: LocationFormValues;
    }) => {
      const raw = await api.patch<
        Parameters<typeof normalizeStorageLocation>[0]
      >(`/api/wms/storage-locations/${id}`, { ...values, zoneId });
      return normalizeStorageLocation(raw);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: zoneLocationsKey(zoneId) });
      qc.invalidateQueries({ queryKey: ALL_LOCATIONS_KEY });
    },
  });
}

export function useDeleteLocation(zoneId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<void>(`/api/wms/storage-locations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: zoneLocationsKey(zoneId) });
      qc.invalidateQueries({ queryKey: ZONES_KEY });
      qc.invalidateQueries({ queryKey: zoneKey(zoneId) });
      qc.invalidateQueries({ queryKey: ALL_LOCATIONS_KEY });
    },
  });
}
