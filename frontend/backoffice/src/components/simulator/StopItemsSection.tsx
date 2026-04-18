"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, Input, Select } from "@/components/ui/Field";
import { ZoneTypeBadge } from "@/components/ui/ZoneTypeBadge";
import {
  ApiError,
  useCreateStopItem,
  useDeleteStopItem,
  useStopItems,
  useUpdateStopItem,
} from "@/lib/simulator/api-hooks";
import { useProducerProducts } from "@/lib/simulator/catalog-api";
import {
  stopItemFormSchema,
  type StopItemFormInput,
  type StopItemFormValues,
} from "@/lib/simulator/schemas";
import type { StopItem, StopItemCreate } from "@/lib/simulator/types";
import type { Product } from "@/lib/types";

type Props = { stopId: string; producerId: string };

// Unités comptables → qty doit être un entier positif.
// Unités pondérables (kg, liter) → décimal autorisé.
const INTEGER_UNITS: ReadonlySet<string> = new Set([
  "piece",
  "bunch",
  "dozen",
  "box",
]);

export function StopItemsSection({ stopId, producerId }: Props) {
  const { data: items = [], isLoading, isError } = useStopItems(stopId);
  const { data: products = [] } = useProducerProducts(producerId);
  const deleteMutation = useDeleteStopItem(stopId);

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StopItem | null>(null);

  const productsById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  const total = useMemo(() => {
    let sum = 0;
    let allPriced = items.length > 0;
    for (const it of items) {
      if (it.unitPrice == null) {
        allPriced = false;
        break;
      }
      sum += it.quantity * it.unitPrice;
    }
    return allPriced ? sum : null;
  }, [items]);

  return (
    <section className="space-y-3 mt-4 pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-catl-primary flex items-center gap-2">
          <ShoppingBasket className="w-4 h-4 text-catl-accent" />
          Produits livrés
          <span className="text-xs font-normal text-catl-text">
            ({items.length})
          </span>
        </h3>
        {!adding && (
          <Button
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
          >
            Ajouter
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="text-xs text-catl-text">Chargement des lignes…</div>
      )}
      {isError && (
        <div className="text-xs text-catl-danger">
          Impossible de charger les lignes produit.
        </div>
      )}

      {adding && (
        <StopItemForm
          stopId={stopId}
          products={products}
          onSaved={() => setAdding(false)}
          onCancel={() => setAdding(false)}
        />
      )}

      {!isLoading && !isError && items.length === 0 && !adding && (
        <p className="text-xs italic text-catl-text">
          Aucune ligne produit — ajoute une première ligne pour déclarer ce qui
          est livré à cet arrêt.
        </p>
      )}

      {items.map((it) =>
        editingId === it.id ? (
          <StopItemForm
            key={it.id}
            stopId={stopId}
            item={it}
            products={products}
            onSaved={() => setEditingId(null)}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <StopItemCard
            key={it.id}
            item={it}
            product={productsById.get(it.productId) ?? null}
            onEdit={() => {
              setEditingId(it.id);
              setAdding(false);
            }}
            onDelete={() => setPendingDelete(it)}
          />
        ),
      )}

      {total != null && items.length > 0 && (
        <div className="flex items-center justify-end gap-2 text-xs text-catl-text pt-1">
          <span>Total lignes</span>
          <span className="font-mono font-bold text-catl-primary">
            {total.toFixed(2)} €
          </span>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Supprimer cette ligne produit ?"
        description={
          pendingDelete && (
            <span>
              La ligne{" "}
              <strong>
                {productsById.get(pendingDelete.productId)?.name ??
                  "ce produit"}
              </strong>{" "}
              sera retirée de cet arrêt.
            </span>
          )
        }
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!pendingDelete) return;
          try {
            await deleteMutation.mutateAsync(pendingDelete.id);
            toast.success("Ligne supprimée.");
            setPendingDelete(null);
          } catch (err) {
            toast.error(
              err instanceof ApiError ? err.message : "Suppression impossible.",
            );
            setPendingDelete(null);
          }
        }}
      />
    </section>
  );
}

function StopItemCard({
  item,
  product,
  onEdit,
  onDelete,
}: {
  item: StopItem;
  product: Product | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const subtotal =
    item.unitPrice != null ? item.quantity * item.unitPrice : null;

  return (
    <div className="rounded-md border border-gray-100 bg-white p-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-bold text-sm text-catl-primary">
              {product?.name ?? "Produit inconnu"}
            </span>
            {product?.storageType && (
              <ZoneTypeBadge type={product.storageType} />
            )}
          </div>
          <div className="text-xs text-catl-text flex flex-wrap gap-x-3 gap-y-1">
            <span>
              Qté{" "}
              <span className="font-mono text-catl-primary">
                {item.quantity} {product?.unit ?? ""}
              </span>
            </span>
            {item.unitPrice != null && (
              <span>
                PU{" "}
                <span className="font-mono text-catl-primary">
                  {item.unitPrice.toFixed(2)} €
                </span>
              </span>
            )}
            {subtotal != null && (
              <span>
                Total{" "}
                <span className="font-mono font-bold text-catl-primary">
                  {subtotal.toFixed(2)} €
                </span>
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
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
            aria-label="Supprimer la ligne"
          >
            Suppr.
          </Button>
        </div>
      </div>
    </div>
  );
}

function StopItemForm({
  stopId,
  item,
  products,
  onSaved,
  onCancel,
}: {
  stopId: string;
  item?: StopItem;
  products: Product[];
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const isEdit = !!item;
  const create = useCreateStopItem(stopId);
  const update = useUpdateStopItem(stopId, item?.id ?? "");

  const {
    control,
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<StopItemFormInput, unknown, StopItemFormValues>({
    resolver: zodResolver(stopItemFormSchema),
    mode: "onBlur",
    defaultValues: {
      productId: item?.productId ?? products[0]?.id ?? "",
      quantity: item?.quantity ?? 1,
      unitPrice: item?.unitPrice ?? null,
    },
  });

  const watchedProductId = useWatch({ control, name: "productId" });
  const selectedProduct = products.find((p) => p.id === watchedProductId);
  const isIntegerUnit = selectedProduct
    ? INTEGER_UNITS.has(selectedProduct.unit)
    : false;

  const onSubmit = handleSubmit(async (values) => {
    if (isIntegerUnit && !Number.isInteger(values.quantity)) {
      setError("quantity", {
        type: "manual",
        message: `Unité "${selectedProduct?.unit}" — quantité entière requise.`,
      });
      return;
    }
    clearErrors("quantity");
    const body: StopItemCreate = {
      productId: values.productId,
      quantity: values.quantity,
      unitPrice: values.unitPrice ?? undefined,
    };
    try {
      if (isEdit) {
        await update.mutateAsync(body);
        toast.success("Ligne mise à jour.");
      } else {
        await create.mutateAsync(body);
        toast.success("Ligne ajoutée.");
      }
      onSaved?.();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Erreur de sauvegarde",
      );
    }
  });

  // Pas de <form> ici : StopItemsSection est rendu à l'intérieur du <form>
  // de StopForm — imbriquer deux <form> casse l'hydratation React (cf.
  // pattern CustomerPicker). Le submit est déclenché par un button onClick
  // + preventDefault manuel via handleSubmit de RHF.
  return (
    <div
      className="rounded-md border border-catl-accent/40 bg-catl-accent/5 p-3 space-y-3"
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
          e.preventDefault();
          void onSubmit();
        }
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Produit" required error={errors.productId?.message}>
          <Select
            invalid={!!errors.productId}
            disabled={products.length === 0}
            {...register("productId")}
          >
            {products.length === 0 && (
              <option value="">— Aucun produit au catalogue —</option>
            )}
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.category ? ` (${p.category})` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={`Quantité${selectedProduct ? ` (${selectedProduct.unit})` : ""}`}
          required
          error={errors.quantity?.message}
        >
          <Input
            type="number"
            step={isIntegerUnit ? "1" : "0.01"}
            min="0"
            invalid={!!errors.quantity}
            {...register("quantity")}
          />
        </Field>
        <Field
          label="Prix unitaire (€)"
          hint="Optionnel — laissez vide pour ne pas facturer."
          error={errors.unitPrice?.message as string | undefined}
        >
          <Input
            type="number"
            step="0.01"
            min="0"
            invalid={!!errors.unitPrice}
            {...register("unitPrice")}
          />
        </Field>
      </div>
      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          onClick={() => void onSubmit()}
          loading={isSubmitting}
          disabled={(isEdit && !isDirty) || products.length === 0}
        >
          {isEdit ? "Enregistrer" : "Ajouter"}
        </Button>
      </div>
    </div>
  );
}
