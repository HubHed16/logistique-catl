"use client";

import {
  Leaf,
  Package,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  ZONE_TYPE_OPTIONS,
  ZoneTypeBadge,
} from "@/components/ui/ZoneTypeBadge";
import { ProducerCatalogForm } from "@/components/simulator/ProducerCatalogForm";
import {
  CatalogApiError,
  useDeleteProducerProduct,
  useProducerProducts,
} from "@/lib/simulator/catalog-api";
import type { Product, StorageZoneType } from "@/lib/types";

type Props = { producerId: string };

export function ProducerCatalog({ producerId }: Props) {
  const { data, isLoading, isError } = useProducerProducts(producerId);
  const deleteMutation = useDeleteProducerProduct(producerId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);

  const products = data ?? [];

  const zoneCounts = useMemo(() => {
    const counts: Record<StorageZoneType, number> = {
      ambient: 0,
      fresh: 0,
      negative: 0,
    };
    for (const p of products) {
      if (p.storageType) counts[p.storageType] += 1;
    }
    return counts;
  }, [products]);

  const totalZonesActive = (Object.values(zoneCounts) as number[]).reduce(
    (acc, n) => acc + (n > 0 ? 1 : 0),
    0,
  );

  return (
    <section className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-catl-primary flex items-center gap-2">
          <Package className="w-5 h-5 text-catl-accent" />
          Catalogue produits
          <span className="text-sm font-normal text-catl-text">
            ({products.length})
          </span>
        </h2>
        {!adding && (
          <Button
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
          >
            Ajouter un produit
          </Button>
        )}
      </div>

      {/* Résumé stockage auto */}
      <div className="catl-section catl-section--success">
        <span className="catl-section-pill">
          <Sparkles className="w-3 h-3" /> Zones de stockage requises
        </span>
        <p className="text-xs text-catl-text mb-3">
          Calculées automatiquement à partir des produits du catalogue — plus
          besoin de saisir des surfaces m² à la main.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {ZONE_TYPE_OPTIONS.map((opt) => {
            const count = zoneCounts[opt.value];
            const active = count > 0;
            return (
              <div
                key={opt.value}
                className={`rounded-md border-2 p-3 transition-colors ${
                  active
                    ? "border-catl-success/40 bg-catl-success/5"
                    : "border-gray-100 bg-gray-50 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <ZoneTypeBadge type={opt.value} />
                  <span
                    className={`text-sm font-bold ${
                      active ? "text-catl-success" : "text-catl-text/60"
                    }`}
                  >
                    {count} produit{count > 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-[11px] text-catl-text mt-1.5">{opt.label}</p>
              </div>
            );
          })}
        </div>
        {totalZonesActive === 0 && products.length === 0 && (
          <p className="text-xs italic text-catl-text mt-3">
            Aucune zone active — ajoute des produits pour que les zones
            apparaissent ici.
          </p>
        )}
      </div>

      {/* Formulaire d'ajout */}
      {adding && (
        <ProducerCatalogForm
          producerId={producerId}
          onSaved={() => setAdding(false)}
          onCancel={() => setAdding(false)}
        />
      )}

      {/* États chargement / erreur */}
      {isLoading && (
        <div className="text-sm text-catl-text">Chargement du catalogue…</div>
      )}
      {isError && (
        <div className="text-sm text-catl-danger">
          Impossible de charger le catalogue.
        </div>
      )}

      {/* Liste produits */}
      {!isLoading && !isError && products.length === 0 && !adding && (
        <div className="catl-section catl-section--info">
          <p className="text-sm text-catl-text italic">
            Aucun produit au catalogue pour ce producteur. Ajoute-en un avec
            le bouton ci-dessus.
          </p>
        </div>
      )}

      {products.map((p) =>
        editingId === p.id ? (
          <ProducerCatalogForm
            key={p.id}
            producerId={producerId}
            product={p}
            onSaved={() => setEditingId(null)}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <ProductCard
            key={p.id}
            product={p}
            onEdit={() => {
              setEditingId(p.id);
              setAdding(false);
            }}
            onDelete={() => setPendingDelete(p)}
          />
        ),
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Supprimer ce produit ?"
        description={
          pendingDelete && (
            <span>
              Le produit <strong>{pendingDelete.name}</strong> sera retiré du
              catalogue.
            </span>
          )
        }
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!pendingDelete) return;
          try {
            await deleteMutation.mutateAsync(pendingDelete.id);
            toast.success("Produit supprimé.");
            setPendingDelete(null);
          } catch (err) {
            const msg =
              err instanceof CatalogApiError
                ? err.message
                : "Suppression impossible.";
            toast.error(msg);
            setPendingDelete(null);
          }
        }}
      />
    </section>
  );
}

function ProductCard({
  product,
  onEdit,
  onDelete,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="catl-section catl-section--info">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-bold text-catl-primary">{product.name}</span>
            {product.storageType && (
              <ZoneTypeBadge type={product.storageType} />
            )}
            {product.isBio && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-catl-success/15 text-catl-success">
                <Leaf className="w-3 h-3" /> Bio
              </span>
            )}
          </div>
          <div className="text-xs text-catl-text flex flex-wrap gap-x-3 gap-y-1">
            {product.category && (
              <span>
                Catégorie{" "}
                <span className="font-mono text-catl-primary">
                  {product.category}
                </span>
              </span>
            )}
            <span>
              Unité{" "}
              <span className="font-mono text-catl-primary">
                {product.unit}
              </span>
            </span>
            {product.ean && (
              <span>
                EAN{" "}
                <span className="font-mono text-catl-primary">
                  {product.ean}
                </span>
              </span>
            )}
            {product.certification && (
              <span>
                Certif.{" "}
                <span className="font-mono text-catl-primary">
                  {product.certification}
                </span>
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Pencil className="w-3.5 h-3.5" />}
            onClick={onEdit}
          >
            Éditer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-catl-danger hover:bg-red-50"
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={onDelete}
            aria-label="Supprimer le produit"
          >
            Suppr.
          </Button>
        </div>
      </div>
    </div>
  );
}
