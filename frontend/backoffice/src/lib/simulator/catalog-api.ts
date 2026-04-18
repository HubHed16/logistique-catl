"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Product, StorageZoneType } from "@/lib/types";

// Wrapper fetch direct pour wms-api (catalogue produit par producteur).
// Les chemins sont relatifs à /api/wms (proxy Next → wms:8081/api/*).
// WMS sérialise en snake_case → on normalise en camelCase aux frontières.

type WmsProductDto = {
  id?: string | null;
  name: string;
  category: string | null;
  ean: string | null;
  unit: string;
  storage_type: string | null;
  // Le back sérialise actuellement "is_bia" (coquille côté ProductDto.java).
  // On lit les deux, tant que la coquille n'est pas corrigée.
  is_bio?: boolean;
  is_bia?: boolean;
  certification: string | null;
  producer_id: string;
};

const ZONE_TYPE_SET: ReadonlySet<StorageZoneType> = new Set<StorageZoneType>([
  "ambient",
  "fresh",
  "negative",
]);

function toStorageZone(raw: string | null): StorageZoneType | null {
  if (raw && (ZONE_TYPE_SET as Set<string>).has(raw)) {
    return raw as StorageZoneType;
  }
  return null;
}

function toProduct(dto: WmsProductDto): Product {
  return {
    id: dto.id ?? "",
    name: dto.name,
    category: dto.category ?? null,
    ean: dto.ean ?? null,
    unit: dto.unit,
    storageType: toStorageZone(dto.storage_type),
    isBio: dto.is_bio ?? dto.is_bia ?? false,
    certification: dto.certification ?? null,
    producerId: dto.producer_id,
  };
}

function toWmsDto(p: CatalogProductInput & { id: string }): WmsProductDto {
  // Le back exige la clé "is_bia" (coquille côté ProductDto.java) pour le
  // champ boolean primitif. On envoie les deux pour être robuste : si la
  // coquille est corrigée côté back, l'envoi continue de fonctionner.
  return {
    id: p.id,
    name: p.name,
    category: p.category ?? null,
    ean: p.ean ?? null,
    unit: p.unit,
    storage_type: p.storageType ?? null,
    is_bio: p.isBio,
    is_bia: p.isBio,
    certification: p.certification ?? null,
    producer_id: p.producerId,
  };
}

export class CatalogApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseError(res: Response, fallback: string): Promise<never> {
  let msg = fallback;
  try {
    const body = (await res.json()) as { message?: string; title?: string };
    if (body?.message) msg = body.message;
    else if (body?.title) msg = body.title;
  } catch {
    /* ignore */
  }
  throw new CatalogApiError(`${msg} (${res.status})`, res.status);
}

// ─── Input shape pour create/update ──────────────────────────────────────

export type CatalogProductInput = {
  id?: string;
  producerId: string;
  name: string;
  category: string | null;
  ean: string | null;
  unit: string;
  storageType: StorageZoneType | null;
  isBio: boolean;
  certification: string | null;
};

// ─── React Query keys ────────────────────────────────────────────────────

const producerProductsKey = (producerId: string | undefined) =>
  ["producer-products", producerId ?? "-"] as const;

// ─── Fetch helpers ───────────────────────────────────────────────────────

async function fetchAllProducts(): Promise<WmsProductDto[]> {
  const res = await fetch(`/api/wms/products?page=0&size=1000`);
  if (res.status === 204) return [];
  if (!res.ok) await parseError(res, "Chargement du catalogue impossible");
  return (await res.json()) as WmsProductDto[];
}

async function createProduct(input: CatalogProductInput): Promise<Product> {
  const body = toWmsDto({ ...input, id: "" });
  // L'id est généré côté back — on ne l'envoie pas.
  delete (body as Partial<WmsProductDto>).id;
  const res = await fetch(`/api/wms/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseError(res, "Création du produit impossible");
  const dto = (await res.json()) as WmsProductDto;
  return toProduct(dto);
}

async function updateProduct(
  id: string,
  input: CatalogProductInput,
): Promise<Product> {
  const res = await fetch(`/api/wms/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toWmsDto({ ...input, id })),
  });
  if (!res.ok) await parseError(res, "Mise à jour du produit impossible");
  const dto = (await res.json()) as WmsProductDto;
  return toProduct({ ...dto, id: dto.id ?? id });
}

async function deleteProduct(productId: string): Promise<void> {
  const res = await fetch(`/api/wms/products/${productId}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) {
    await parseError(res, "Suppression impossible");
  }
}

// ─── Hooks ───────────────────────────────────────────────────────────────

export function useProducerProducts(producerId: string | null | undefined) {
  return useQuery({
    queryKey: producerProductsKey(producerId ?? undefined),
    queryFn: async () => {
      const all = await fetchAllProducts();
      return all
        .filter((p) => p.producer_id === producerId)
        .map(toProduct);
    },
    enabled: !!producerId,
    staleTime: 15_000,
  });
}

export function useSaveProducerProduct(producerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CatalogProductInput) =>
      input.id ? updateProduct(input.id, input) : createProduct(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: producerProductsKey(producerId) });
    },
  });
}

export function useDeleteProducerProduct(producerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => deleteProduct(productId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: producerProductsKey(producerId) });
    },
  });
}
