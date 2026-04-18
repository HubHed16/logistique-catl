"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/apigen/client";
import type { components } from "@/lib/apigen/types";
import type {
  InfrastructureUpdate,
  ProducerCreate,
  ProducerUpdate,
  VehicleCreate,
  VehicleUpdate,
} from "./types";

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
const producersKey = (search?: string) =>
  ["producers", { search: search ?? "" }] as const;
const producerKey = (id: string | undefined) =>
  ["producers", id ?? "-"] as const;
const infrastructureKey = (producerId: string | undefined) =>
  ["infrastructure", producerId ?? "-"] as const;
const vehiclesKey = (producerId: string | undefined) =>
  ["vehicles", producerId ?? "-"] as const;

// ─── Producers ─────────────────────────────────────────────────────────────

export function useProducers(search?: string) {
  return useQuery({
    queryKey: producersKey(search),
    queryFn: async () =>
      unwrap(
        await apiClient.GET("/producers", {
          params: { query: { limit: 100, search } },
        }),
      ),
    staleTime: 30_000,
  });
}

export function useProducer(id: string | null | undefined) {
  return useQuery({
    queryKey: producerKey(id ?? undefined),
    queryFn: async () =>
      unwrap(
        await apiClient.GET("/producers/{producerId}", {
          params: { path: { producerId: id! } },
        }),
      ),
    enabled: !!id,
  });
}

export function useCreateProducer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: ProducerCreate) =>
      unwrap(await apiClient.POST("/producers", { body })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["producers"] });
    },
  });
}

export function useUpdateProducer(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: ProducerUpdate) =>
      unwrap(
        await apiClient.PUT("/producers/{producerId}", {
          params: { path: { producerId: id } },
          body,
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["producers"] });
      qc.invalidateQueries({ queryKey: producerKey(id) });
    },
  });
}

export function useDeleteProducer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.DELETE("/producers/{producerId}", {
        params: { path: { producerId: id } },
      });
      assertOk(res.response, "Suppression producteur impossible");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["producers"] });
    },
  });
}

// ─── Infrastructure ────────────────────────────────────────────────────────

export function useInfrastructure(producerId: string | null | undefined) {
  return useQuery({
    queryKey: infrastructureKey(producerId ?? undefined),
    queryFn: async () => {
      const res = await apiClient.GET(
        "/producers/{producerId}/infrastructure",
        {
          params: { path: { producerId: producerId! } },
        },
      );
      // 404 avant premier PUT → on renvoie null plutôt que de throw
      if (res.response.status === 404) return null;
      return unwrap(res);
    },
    enabled: !!producerId,
  });
}

export function useUpsertInfrastructure(producerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: InfrastructureUpdate) =>
      unwrap(
        await apiClient.PUT("/producers/{producerId}/infrastructure", {
          params: { path: { producerId } },
          body,
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: infrastructureKey(producerId) });
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
