import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ReceptionFormValues } from "@/lib/schemas";
import type {
  ReceptionRequest,
  ReceptionResponse,
  StorageLocation,
  StorageZoneType,
} from "@/lib/types";

const availableLocationsKey = (storageType: StorageZoneType | undefined) =>
  ["storage-locations", "available", storageType ?? "all"] as const;

export function useAvailableLocations(
  storageType: StorageZoneType | undefined,
) {
  return useQuery({
    queryKey: availableLocationsKey(storageType),
    queryFn: () =>
      api.get<StorageLocation[]>("/api/storage-locations/available", {
        storageType: storageType ?? null,
      }),
    enabled: !!storageType,
  });
}

export function useReception() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: ReceptionFormValues) => {
      const payload: ReceptionRequest = {
        productId: values.productId,
        ean: values.ean,
        lotNumber: values.lotNumber,
        quantity: values.quantity,
        unit: values.unit,
        weightDeclared: values.weightDeclared,
        weightActual: values.weightActual,
        receptionTemp: values.receptionTemp,
        expirationDate: values.expirationDate,
        bestBefore: values.bestBefore,
        qualityOk: values.qualityOk,
        statusReason: values.statusReason,
        locationId: values.locationId,
      };
      return api.post<ReceptionResponse>("/api/reception", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["storage-locations", "available"] });
    },
  });
}
