"use client";

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { apiClient } from "@/lib/apigen/client";
import type { components } from "@/lib/apigen/types";
import type {
  CustomerCreate,
  DayOfWeek,
  InfrastructureUpdate,
  OptimizationInput,
  ProducerUpdate,
  RouteCreate,
  RouteStatus,
  RouteUpdate,
  StopCreate,
  StopItemCreate,
  StopItemUpdate,
  StopUpdate,
  VehicleCreate,
  VehicleUpdate,
} from "./types";
import {
  WmsApiError,
  wmsCreateProducer,
  wmsDeleteProducer,
  wmsGetProducer,
  wmsListProducers,
  wmsUpdateProducer,
} from "./wms-client";

// Petit helper qui déballe { data, error } → throw en cas d'erreur pour
// que React Query gère la branche error automatiquement.
type ApiErrorShape = components["schemas"]["Error"] & {
  status?: number;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  constructor(message: string, status: number, code: string, details: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function unwrap<T>(
  result: { data?: T; error?: ApiErrorShape; response: Response },
): T {
  if (result.error) {
    throw new ApiError(
      result.error.message ?? "Erreur API",
      result.response.status,
      result.error.code ?? "UNKNOWN",
      result.error.details,
    );
  }
  if (result.data === undefined) {
    throw new ApiError(
      "Réponse vide",
      result.response.status,
      "EMPTY_RESPONSE",
      null,
    );
  }
  return result.data;
}

function assertOk(response: Response, defaultMsg: string): void {
  if (response.ok) return;
  throw new ApiError(
    `${defaultMsg} (${response.status})`,
    response.status,
    "HTTP_ERROR",
    null,
  );
}

// ─── Clés React Query ──────────────────────────────────────────────────────
const producersKey = () => ["producers"] as const;
const producerKey = (id: string | undefined) =>
  ["producers", id ?? "-"] as const;
const infrastructureKey = (producerId: string | undefined) =>
  ["infrastructure", producerId ?? "-"] as const;
const infrastructuresKey = () => ["infrastructures"] as const;
const vehiclesKey = (producerId: string | undefined) =>
  ["vehicles", producerId ?? "-"] as const;
const routesKey = (producerId: string | undefined) =>
  ["routes", producerId ?? "-"] as const;
const routeKey = (routeId: string | undefined) =>
  ["routes", "detail", routeId ?? "-"] as const;
const customersKey = (producerId: string | undefined, search?: string) =>
  [
    "customers",
    producerId ?? "-",
    { search: (search ?? "").trim() },
  ] as const;
const stopItemsKey = (stopId: string | undefined) =>
  ["stop-items", stopId ?? "-"] as const;

// ─── Producers ─────────────────────────────────────────────────────────────
// Les producteurs sont la source de vérité de wms-api. Tour-api ne proxie
// que le GET list (et il est cassé côté back pour l'instant), donc on
// tape directement sur /api/wms/producers → cf. simulator/wms-client.ts.

export function useProducers() {
  return useQuery({
    queryKey: producersKey(),
    queryFn: () => wmsListProducers(0, 1000),
    staleTime: 30_000,
  });
}

export function useProducer(id: string | null | undefined) {
  return useQuery({
    queryKey: producerKey(id ?? undefined),
    queryFn: () => wmsGetProducer(id!),
    enabled: !!id,
  });
}

export function useCreateProducer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProducerUpdate) => wmsCreateProducer(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["producers"] });
    },
  });
}

export function useUpdateProducer(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProducerUpdate) => wmsUpdateProducer(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["producers"] });
      qc.invalidateQueries({ queryKey: producerKey(id) });
    },
  });
}

export function useDeleteProducer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => wmsDeleteProducer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["producers"] });
    },
  });
}

// Ré-exporté pour que l'UI affiche des erreurs cohérentes quelle que soit
// l'origine (tour-api ApiError ou wms-api WmsApiError).
export { WmsApiError };

// ─── Infrastructure ────────────────────────────────────────────────────────

async function fetchAllInfrastructures(): Promise<components["schemas"]["Infrastructure"][]> {
  const limit = 200;
  let offset = 0;
  const items: components["schemas"]["Infrastructure"][] = [];

  // On boucle tant que la page est pleine.
  // (L'OpenAPI renvoie { total, limit, offset, items? }).
  for (;;) {
    const page = unwrap(
      await apiClient.GET("/infrastructures", {
        params: { query: { limit, offset } },
      }),
    );

    const batch = page.items ?? [];
    items.push(...batch);

    if (batch.length < limit) break;
    offset += limit;

    // garde-fou (évite boucle infinie si backend bug)
    if (offset > 20_000) break;
  }

  return items;
}

export function useInfrastructure(producerId: string | null | undefined) {
  return useQuery({
    queryKey: infrastructureKey(producerId ?? undefined),
    queryFn: async () => {
      if (!producerId) return null;
      const all = await fetchAllInfrastructures();
      return all.find((i) => i.id === producerId) ?? null;
    },
    enabled: !!producerId,
  });
}

export function useInfrastructures() {
  return useQuery({
    queryKey: infrastructuresKey(),
    queryFn: fetchAllInfrastructures,
    staleTime: 30_000,
  });
}

export function useUpsertInfrastructure(producerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: InfrastructureUpdate) =>
      unwrap(
        await apiClient.PUT("/infrastructures/{infrastructureId}", {
          params: { path: { infrastructureId: producerId } },
          body,
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: infrastructureKey(producerId) });
      qc.invalidateQueries({ queryKey: infrastructuresKey() });
    },
  });
}

// ─── Vehicles ──────────────────────────────────────────────────────────────

export function useVehicles(producerId: string | null | undefined) {
  return useQuery({
    queryKey: vehiclesKey(producerId ?? undefined),
    queryFn: async () =>
      unwrap(
        await apiClient.GET("/vehicles", {
          params: { query: { producerId: producerId!, limit: 50 } },
        }),
      ),
    enabled: !!producerId,
  });
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: VehicleCreate) =>
      unwrap(await apiClient.POST("/vehicles", { body })),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: vehiclesKey(variables.producerId) });
    },
  });
}

export function useUpdateVehicle(producerId: string, vehicleId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: VehicleUpdate) =>
      unwrap(
        await apiClient.PUT("/vehicles/{vehicleId}", {
          params: { path: { vehicleId } },
          body,
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: vehiclesKey(producerId) });
    },
  });
}

// ─── Geocoding ─────────────────────────────────────────────────────────────

// Retourne les suggestions Nominatim pour la requête (via tour-api / mock).
// La requête vide ou <3 caractères ne déclenche pas de fetch.
export function useGeocode(query: string) {
  const trimmed = query.trim();
  const enabled = trimmed.length >= 3;
  return useQuery({
    queryKey: ["geocode", trimmed] as const,
    queryFn: async () =>
      unwrap(
        await apiClient.POST("/geo/geocode", { body: { query: trimmed } }),
      ),
    enabled,
    staleTime: 60_000,
  });
}

// Résout l'adresse d'un producteur en coordonnées pour le marqueur carte.
// La DTO wms-api ne stocke que l'adresse texte — on géocode à la volée
// (premier résultat) et on cache 1h côté React Query. Null si adresse
// absente ou géocodage échoué.
export function useProducerCoords(
  address: string | null | undefined,
): { lat: number; lon: number } | null {
  const trimmed = (address ?? "").trim();
  const query = useQuery({
    queryKey: ["geocode", "coords", trimmed] as const,
    queryFn: async () => {
      const res = await apiClient.POST("/geo/geocode", {
        body: { query: trimmed },
      });
      const first = res.data?.[0];
      return first
        ? { lat: first.latitude, lon: first.longitude }
        : null;
    },
    enabled: trimmed.length >= 3,
    staleTime: 60 * 60 * 1000,
  });
  return query.data ?? null;
}

// ─── Routing ───────────────────────────────────────────────────────────────

// Calcule distance/durée réseau + géométrie pour une liste ordonnée de
// waypoints via POST /geo/route. Le back renvoie une polyline encodée
// (optionnelle) qu'on décode côté carte. Utilisé pour afficher le trajet
// routier réel au lieu de segments droits.
type Waypoint = { latitude: number; longitude: number };

export function useComputeRoute(
  waypoints: Waypoint[],
  returnGeometry = true,
) {
  // Clé stable basée sur la séquence de coords arrondies (évite le refetch
  // au jitter de géocodage).
  const key = waypoints
    .map((w) => `${w.latitude.toFixed(5)},${w.longitude.toFixed(5)}`)
    .join("|");
  return useQuery({
    queryKey: ["geo", "route", returnGeometry, key] as const,
    queryFn: async () =>
      unwrap(
        await apiClient.POST("/geo/route", {
          body: { waypoints, returnGeometry },
        }),
      ),
    enabled: waypoints.length >= 2,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// Variante batch de useProducerCoords/useProducer pour la carte d'optim :
// fetch N producteurs + géocodage en parallèle via useQueries (une seule
// re-render React pour tout le batch, cache partagé avec les appels unitaires).
export function useProducerDepots(producerIds: readonly string[]) {
  const uniqueIds = useMemo(
    () => Array.from(new Set(producerIds)).sort(),
    [producerIds],
  );

  const producerQueries = useQueries({
    queries: uniqueIds.map((id) => ({
      queryKey: producerKey(id),
      queryFn: () => wmsGetProducer(id),
      staleTime: 60_000,
    })),
  });

  const coordQueries = useQueries({
    queries: uniqueIds.map((_, i) => {
      const producer = producerQueries[i]?.data;
      const address = (producer?.address ?? "").trim();
      const hasDirectCoords =
        producer?.latitude != null && producer?.longitude != null;
      return {
        queryKey: ["geocode", "coords", address] as const,
        queryFn: async () => {
          const res = await apiClient.POST("/geo/geocode", {
            body: { query: address },
          });
          const first = res.data?.[0];
          return first
            ? { lat: first.latitude, lon: first.longitude }
            : null;
        },
        enabled: !hasDirectCoords && address.length >= 3,
        staleTime: 60 * 60 * 1000,
      };
    }),
  });

  return useMemo(() => {
    const out = new Map<
      string,
      { lat: number; lon: number; name: string; address: string }
    >();
    uniqueIds.forEach((id, i) => {
      const producer = producerQueries[i]?.data;
      if (!producer) return;

      // 1) priorité: coords stockées en DB WMS
      if (producer.latitude != null && producer.longitude != null) {
        out.set(id, {
          lat: producer.latitude,
          lon: producer.longitude,
          name: producer.name,
          address: producer.address ?? "",
        });
        return;
      }

      // 2) fallback: géocodage adresse
      const coords = coordQueries[i]?.data;
      if (!coords) return;
      out.set(id, {
        lat: coords.lat,
        lon: coords.lon,
        name: producer.name,
        address: producer.address ?? "",
      });
    });
    return out;
  }, [uniqueIds, producerQueries, coordQueries]);
}

// Batch /geo/route — fetch la géométrie routière réelle pour plusieurs
// tournées en parallèle. Les waypoints sont stringifiés en cache key pour
// partager le cache avec useComputeRoute.
export function useRoadGeometries(
  routes: ReadonlyArray<{
    routeId: string;
    waypoints: ReadonlyArray<{ latitude: number; longitude: number }>;
  }>,
) {
  const queries = useQueries({
    queries: routes.map((r) => {
      // Nettoyage: supprimer NaN/undefined + doublons consécutifs.
      const cleanedWaypoints = r.waypoints
        .filter(
          (w) =>
            w != null &&
            Number.isFinite(w.latitude) &&
            Number.isFinite(w.longitude),
        )
        .filter((w, idx, arr) => {
          if (idx === 0) return true;
          const prev = arr[idx - 1];
          return prev.latitude !== w.latitude || prev.longitude !== w.longitude;
        });

      const key = cleanedWaypoints
        .map((w) => `${w.latitude.toFixed(5)},${w.longitude.toFixed(5)}`)
        .join("|");

      return {
        queryKey: ["geo", "route", true, key] as const,
        queryFn: async () =>
          unwrap(
            await apiClient.POST("/geo/route", {
              body: {
                waypoints: [...cleanedWaypoints],
                returnGeometry: true,
              },
            }),
          ),
        enabled: cleanedWaypoints.length >= 2,
        staleTime: 5 * 60 * 1000,
        retry: 1,
      };
    }),
  });

  return useMemo(() => {
    const out = new Map<
      string,
      { geometry: string | null | undefined; isLoading: boolean }
    >();
    routes.forEach((r, i) => {
      const q = queries[i];
      out.set(r.routeId, {
        geometry: q?.data?.geometry,
        isLoading: !!q?.isLoading,
      });
    });
    return out;
  }, [routes, queries]);
}

export function useDeleteVehicle(producerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vehicleId: string) => {
      const res = await apiClient.DELETE("/vehicles/{vehicleId}", {
        params: { path: { vehicleId } },
      });
      assertOk(res.response, "Suppression véhicule impossible");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: vehiclesKey(producerId) });
    },
  });
}

// ─── Routes ────────────────────────────────────────────────────────────────

type RoutesFilters = {
  dayOfWeek?: DayOfWeek;
  status?: RouteStatus;
  scheduledDate?: string;
};

export function useRoutes(
  producerId: string | null | undefined,
  filters: RoutesFilters = {},
) {
  return useQuery({
    queryKey: [...routesKey(producerId ?? undefined), filters] as const,
    queryFn: async () =>
      unwrap(
        await apiClient.GET("/routes", {
          params: {
            query: {
              producerId: producerId!,
              limit: 100,
              ...filters,
            },
          },
        }),
      ),
    enabled: !!producerId,
    staleTime: 15_000,
  });
}

export function useRoute(routeId: string | null | undefined) {
  return useQuery({
    queryKey: routeKey(routeId ?? undefined),
    queryFn: async () =>
      unwrap(
        await apiClient.GET("/routes/{routeId}", {
          params: { path: { routeId: routeId! } },
        }),
      ),
    enabled: !!routeId,
  });
}

// Statut de verrouillage d'un trajet — terminal (completed/cancelled) ou
// validé le jour même. Utilisé à la fois par l'éditeur sidebar et la carte
// pour activer/désactiver les actions d'édition (ajout d'arrêts, etc.).
export function useRouteLockStatus(routeId: string | null | undefined): {
  isLoading: boolean;
  isTerminal: boolean;
  isValidated: boolean;
  isScheduledToday: boolean;
  isLocked: boolean;
} {
  const { data: route, isLoading } = useRoute(routeId);
  if (!route) {
    // Pas de route chargée ⇒ on verrouille par défaut : le consommateur qui
    // veut éviter toute action sans route active est protégé.
    return {
      isLoading,
      isTerminal: false,
      isValidated: false,
      isScheduledToday: false,
      isLocked: true,
    };
  }
  const isTerminal =
    route.status === "completed" || route.status === "cancelled";
  const isValidated = route.status === "validated";
  const todayIso = new Date().toLocaleDateString("en-CA");
  const isScheduledToday =
    !!route.scheduledDate && route.scheduledDate === todayIso;
  const isLocked = isTerminal || (isValidated && isScheduledToday);
  return { isLoading, isTerminal, isValidated, isScheduledToday, isLocked };
}

export function useCreateRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: RouteCreate) =>
      unwrap(await apiClient.POST("/routes", { body })),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: routesKey(variables.producerId) });
    },
  });
}

export function useUpdateRoute(producerId: string, routeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: RouteUpdate) =>
      unwrap(
        await apiClient.PUT("/routes/{routeId}", {
          params: { path: { routeId } },
          body,
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: routesKey(producerId) });
      qc.invalidateQueries({ queryKey: routeKey(routeId) });
    },
  });
}

export function useDeleteRoute(producerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (routeId: string) => {
      const res = await apiClient.DELETE("/routes/{routeId}", {
        params: { path: { routeId } },
      });
      assertOk(res.response, "Suppression trajet impossible");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: routesKey(producerId) });
    },
  });
}

export function useDuplicateRoute(producerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (routeId: string) =>
      unwrap(
        await apiClient.POST("/routes/{routeId}/duplicate", {
          params: { path: { routeId } },
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: routesKey(producerId) });
    },
  });
}

export function useValidateRoute(producerId: string, routeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      unwrap(
        await apiClient.POST("/routes/{routeId}/validate", {
          params: { path: { routeId } },
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: routesKey(producerId) });
      qc.invalidateQueries({ queryKey: routeKey(routeId) });
    },
  });
}

export function useOptimizeRoute(producerId: string, routeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      unwrap(
        await apiClient.POST("/routes/{routeId}/optimize", {
          params: { path: { routeId } },
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: routesKey(producerId) });
      qc.invalidateQueries({ queryKey: routeKey(routeId) });
    },
  });
}

// ─── Stops ─────────────────────────────────────────────────────────────────

export function useCreateStop(routeId: string, producerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: StopCreate) =>
      unwrap(
        await apiClient.POST("/routes/{routeId}/stops", {
          params: { path: { routeId } },
          body,
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: routeKey(routeId) });
      qc.invalidateQueries({ queryKey: routesKey(producerId) });
    },
  });
}

export function useUpdateStop(
  routeId: string,
  stopId: string,
  producerId: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: StopUpdate) =>
      unwrap(
        await apiClient.PUT("/routes/{routeId}/stops/{stopId}", {
          params: { path: { routeId, stopId } },
          body,
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: routeKey(routeId) });
      qc.invalidateQueries({ queryKey: routesKey(producerId) });
    },
  });
}

export function useDeleteStop(routeId: string, producerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (stopId: string) => {
      const res = await apiClient.DELETE("/routes/{routeId}/stops/{stopId}", {
        params: { path: { routeId, stopId } },
      });
      assertOk(res.response, "Suppression arrêt impossible");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: routeKey(routeId) });
      qc.invalidateQueries({ queryKey: routesKey(producerId) });
    },
  });
}

export function useReorderStops(routeId: string, producerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (order: string[]) =>
      unwrap(
        await apiClient.PATCH("/routes/{routeId}/stops/reorder", {
          params: { path: { routeId } },
          body: { order },
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: routeKey(routeId) });
      qc.invalidateQueries({ queryKey: routesKey(producerId) });
    },
    onError: () => {
      // Re-sync cache on failure so the optimistic order is reverted.
      qc.invalidateQueries({ queryKey: routeKey(routeId) });
    },
  });
}

// ─── Customers ─────────────────────────────────────────────────────────────

export function useCustomers(
  producerId: string | null | undefined,
  search?: string,
) {
  const normalized = (search ?? "").trim();
  return useQuery({
    queryKey: customersKey(producerId ?? undefined, normalized),
    queryFn: async () =>
      unwrap(
        await apiClient.GET("/customers", {
          params: {
            query: {
              producerId: producerId!,
              search: normalized || undefined,
              limit: 20,
            },
          },
        }),
      ),
    enabled: !!producerId,
    staleTime: 15_000,
  });
}

export function useOptimizeDailyRouting() {
  return useMutation({
    mutationFn: async (body: OptimizationInput) =>
      unwrap(await apiClient.POST("/optimization/daily-routing", { body })),
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CustomerCreate) =>
      unwrap(await apiClient.POST("/customers", { body })),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: ["customers", variables.producerId] as const,
      });
    },
  });
}

// ─── Stop items (lignes produit par arrêt) ─────────────────────────────────

export function useStopItems(stopId: string | null | undefined) {
  return useQuery({
    queryKey: stopItemsKey(stopId ?? undefined),
    queryFn: async () =>
      unwrap(
        await apiClient.GET("/stops/{stopId}/items", {
          params: { path: { stopId: stopId! } },
        }),
      ),
    enabled: !!stopId,
    staleTime: 15_000,
  });
}

export function useCreateStopItem(stopId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: StopItemCreate) =>
      unwrap(
        await apiClient.POST("/stops/{stopId}/items", {
          params: { path: { stopId } },
          body,
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: stopItemsKey(stopId) });
    },
  });
}

export function useUpdateStopItem(stopId: string, itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: StopItemUpdate) =>
      unwrap(
        await apiClient.PUT("/stops/{stopId}/items/{itemId}", {
          params: { path: { stopId, itemId } },
          body,
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: stopItemsKey(stopId) });
    },
  });
}

export function useDeleteStopItem(stopId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiClient.DELETE("/stops/{stopId}/items/{itemId}", {
        params: { path: { stopId, itemId } },
      });
      assertOk(res.response, "Suppression ligne produit impossible");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: stopItemsKey(stopId) });
    },
  });
}
