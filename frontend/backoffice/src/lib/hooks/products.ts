import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { Producer, Product } from "@/lib/types";
import type { ProductCreateValues } from "@/lib/schemas";

const PRODUCERS_KEY = ["producers"] as const;
const productByEanKey = (ean: string) => ["products", "by-ean", ean] as const;

export function useProducers() {
  return useQuery({
    queryKey: PRODUCERS_KEY,
    queryFn: () => api.get<Producer[]>("/api/producers"),
    staleTime: 5 * 60_000,
  });
}

/**
 * Lookup produit par EAN. Enabled seulement si l'EAN est non-vide.
 * Retourne null si 404 (produit inconnu — l'UI propose alors la création).
 */
export function useProductByEan(ean: string | undefined) {
  return useQuery<Product | null>({
    queryKey: ean ? productByEanKey(ean) : ["products", "by-ean", "missing"],
    queryFn: async () => {
      try {
        return await api.get<Product>(
          `/api/products/by-ean/${encodeURIComponent(ean!)}`,
        );
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled: !!ean && ean.length > 0,
    staleTime: 30_000,
    retry: 0,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: ProductCreateValues) =>
      api.post<Product>("/api/products", values),
    onSuccess: (product) => {
      if (product.ean) {
        qc.setQueryData(productByEanKey(product.ean), product);
      }
    },
  });
}
