import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { StorageZone, StorageLocation } from "@/lib/types";
import type {
  LocationFormValues,
  ZoneFormValues,
} from "@/lib/schemas";

const ZONES_KEY = ["zones"] as const;
const zoneKey = (id: string) => ["zones", id] as const;
const zoneLocationsKey = (zoneId: string) =>
  ["zones", zoneId, "locations"] as const;

export function useZones() {
  return useQuery({
    queryKey: ZONES_KEY,
    queryFn: () => api.get<StorageZone[]>("/api/storage-zones"),
  });
}

export function useZone(id: string | undefined) {
  return useQuery({
    queryKey: id ? zoneKey(id) : ["zones", "missing"],
    queryFn: () => api.get<StorageZone>(`/api/storage-zones/${id}`),
    enabled: !!id,
  });
}

export function useZoneLocations(zoneId: string | undefined) {
  return useQuery({
    queryKey: zoneId ? zoneLocationsKey(zoneId) : ["zones", "locations", "missing"],
    queryFn: () =>
      api.get<StorageLocation[]>(
        `/api/storage-zones/${zoneId}/locations`,
      ),
    enabled: !!zoneId,
  });
}

export function useCreateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: ZoneFormValues) =>
      api.post<StorageZone>("/api/storage-zones", values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ZONES_KEY });
    },
  });
}

export function useUpdateZone(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: ZoneFormValues) =>
      api.patch<StorageZone>(`/api/storage-zones/${id}`, values),
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
      api.delete<void>(`/api/storage-zones/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ZONES_KEY });
    },
  });
}

export function useCreateLocation(zoneId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: LocationFormValues) =>
      api.post<StorageLocation>(
        `/api/storage-zones/${zoneId}/locations`,
        values,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: zoneLocationsKey(zoneId) });
      qc.invalidateQueries({ queryKey: ZONES_KEY });
      qc.invalidateQueries({ queryKey: zoneKey(zoneId) });
    },
  });
}

export function useUpdateLocation(zoneId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: LocationFormValues;
    }) => api.patch<StorageLocation>(`/api/storage-locations/${id}`, values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: zoneLocationsKey(zoneId) });
    },
  });
}

export function useDeleteLocation(zoneId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<void>(`/api/storage-locations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: zoneLocationsKey(zoneId) });
      qc.invalidateQueries({ queryKey: ZONES_KEY });
      qc.invalidateQueries({ queryKey: zoneKey(zoneId) });
    },
  });
}
