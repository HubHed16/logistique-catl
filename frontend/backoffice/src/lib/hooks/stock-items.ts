import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { normalizeStockItem } from "@/lib/api-normalizers";
import type { StockItemStatus } from "@/lib/types";

type Paginated<T> = { content: T[] } | T[];

function unwrap<T>(page: Paginated<T>): T[] {
  return Array.isArray(page) ? page : (page?.content ?? []);
}

const STOCK_KEY = ["stock-items"] as const;

export function useStockItems(status?: StockItemStatus) {
  return useQuery({
    queryKey: [...STOCK_KEY, { status }],
    queryFn: async () => {
      const path = status
        ? "/api/wms/stock-items/search"
        : "/api/wms/stock-items";
      const query = status
        ? { status, size: 200, page: 0 }
        : { size: 200, page: 0 };
      const raw = await api.get<Paginated<Parameters<typeof normalizeStockItem>[0]>>(
        path,
        query,
      );
      return unwrap(raw).map(normalizeStockItem);
    },
    staleTime: 30_000,
  });
}

export function useExpiringStockItems(enabled: boolean, daysAhead = 7) {
  return useQuery({
    queryKey: [...STOCK_KEY, "expiring", daysAhead],
    queryFn: async () => {
      const raw = await api.get<Paginated<Parameters<typeof normalizeStockItem>[0]>>(
        "/api/wms/stock-items/expiring-soon",
        { daysAhead },
      );
      return unwrap(raw).map(normalizeStockItem);
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useLowStockItems(enabled: boolean, threshold = 10) {
  return useQuery({
    queryKey: [...STOCK_KEY, "low-stock", threshold],
    queryFn: async () => {
      const raw = await api.get<Paginated<Parameters<typeof normalizeStockItem>[0]>>(
        "/api/wms/stock-items/low-stock",
        { threshold },
      );
      return unwrap(raw).map(normalizeStockItem);
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useUpdateStockItemStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: StockItemStatus;
      reason?: string;
    }) =>
      api.patch<void>(`/api/wms/stock-items/${id}/status`, {
        status,
        statusReason: reason || undefined,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: STOCK_KEY }),
  });
}

export function useDeleteStockItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/wms/stock-items/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: STOCK_KEY }),
  });
}
