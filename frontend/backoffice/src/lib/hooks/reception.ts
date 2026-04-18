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
      api.get<StorageLocation[]>("/api/v1/storage-locations/available", {
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
        weightDecl: values.weightDecl,
        weightAct: values.weightAct,
        receptionTemp: values.receptionTemp,
        expirationDate: values.expirationDate,
        bestBefore: values.bestBefore,
        qualityOk: values.qualityOk,
        statusReason: values.statusReason,
        routing: values.routing,
        locationId: values.locationId,
      };
      return api.post<ReceptionResponse>("/api/v1/reception", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["storage-locations", "available"] });
    },
  });
}
