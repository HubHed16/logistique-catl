import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import {
  denormalizeProduct,
  normalizeProducer,
  normalizeProduct,
} from "@/lib/api-normalizers";
import type { Producer, Product, StorageZoneType } from "@/lib/types";
import type { ProductCreateValues } from "@/lib/schemas";

const PRODUCERS_KEY = ["producers"] as const;
const ALL_PRODUCTS_KEY = ["products", "all"] as const;
const productByEanKey = (ean: string) => ["products", "by-ean", ean] as const;

type Paginated<T> = { content: T[] } | T[];

function unwrap<T>(page: Paginated<T>): T[] {
  return Array.isArray(page) ? page : (page?.content ?? []);
}

export function useProducers() {
  return useQuery({
    queryKey: PRODUCERS_KEY,
    queryFn: async () => {
      const raw = await api.get<Paginated<Parameters<typeof normalizeProducer>[0]>>(
        "/api/wms/producers",
        { size: 200, page: 0 },
      );
      return unwrap(raw).map(normalizeProducer) as Producer[];
    },
    staleTime: 5 * 60_000,
  });
}

// Le back n'expose pas /by-ean. On fetche une page unique (500) et on filtre
// client-side — adéquat pour un catalogue hackathon.
export function useAllProducts() {
  return useQuery({
    queryKey: ALL_PRODUCTS_KEY,
    queryFn: async () => {
      const raw = await api.get<
        Paginated<Parameters<typeof normalizeProduct>[0]>
      >("/api/wms/products", { size: 500, page: 0 });
      return unwrap(raw).map(normalizeProduct);
    },
    staleTime: 60_000,
  });
}

export function useProductByEan(ean: string | undefined) {
  const products = useAllProducts();
  const trimmed = ean?.trim();
  const data = trimmed
    ? ((products.data ?? []).find((p) => p.ean === trimmed) ?? null)
    : null;
  return {
    data: trimmed ? data : null,
    isFetching: products.isFetching && !!trimmed,
    isLoading: products.isLoading && !!trimmed,
    isError: products.isError,
    error: products.error,
    refetch: products.refetch,
  };
}

// Garde la clé pour l'optimistic set côté useCreateProduct.
export { productByEanKey };

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: ProductCreateValues) => {
      const body = denormalizeProduct({
        name: values.name,
        category: values.category,
        ean: values.ean ?? null,
        unit: values.unit,
        storageType: values.storageType,
        isBio: values.isBio,
        certification: values.certification ?? null,
        producerId: values.producerId,
      });
      const raw = await api.post<Parameters<typeof normalizeProduct>[0]>(
        "/api/wms/products",
        body,
      );
      return normalizeProduct(raw);
    },
    onSuccess: (product) => {
      qc.invalidateQueries({ queryKey: ALL_PRODUCTS_KEY });
      if (product.ean) {
        qc.setQueryData(productByEanKey(product.ean), product);
      }
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        // No-op — le composant affiche déjà le message.
      }
    },
  });
}

export type ProductUpdateValues = {
  name: string;
  category: string | null;
  ean: string | null;
  unit: string;
  storageType: StorageZoneType | null;
  isBio: boolean;
  certification: string | null;
  producerId: string;
};

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ProductUpdateValues }) => {
      const body = denormalizeProduct(values);
      const raw = await api.put<Parameters<typeof normalizeProduct>[0]>(
        `/api/wms/products/${id}`,
        body,
      );
      return normalizeProduct(raw);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ALL_PRODUCTS_KEY });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/wms/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ALL_PRODUCTS_KEY });
    },
  });
}
