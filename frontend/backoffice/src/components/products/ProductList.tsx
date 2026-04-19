"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, X, Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ZoneTypeBadge, ZONE_TYPE_OPTIONS } from "@/components/ui/ZoneTypeBadge";
import { ProductCreateInline } from "@/components/reception/ProductCreateInline";
import { ApiError } from "@/lib/api";
import {
  useAllProducts,
  useProducers,
  useUpdateProduct,
  useDeleteProduct,
} from "@/lib/hooks/products";
import { productCreateSchema, type ProductCreateInput, type ProductCreateValues } from "@/lib/schemas";
import type { Product } from "@/lib/types";

const UNIT_OPTIONS = [
  { value: "kg", label: "kg" },
  { value: "piece", label: "Pièce" },
  { value: "liter", label: "Litre" },
  { value: "bunch", label: "Botte" },
  { value: "dozen", label: "Douzaine" },
  { value: "box", label: "Caisse" },
];

export function ProductList() {
  const { data, isLoading, isError, error, refetch } = useAllProducts();
  const producersQuery = useProducers();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);

  const producersMap = new Map((producersQuery.data ?? []).map((p) => [p.id, p]));

  if (isLoading) return <div className="text-sm text-catl-text">Chargement...</div>;
  if (isError) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return (
      <div className="text-sm text-catl-danger">
        Erreur : {msg}{" "}
        <button type="button" className="underline" onClick={() => void refetch()}>
          réessayer
        </button>
      </div>
    );
  }

  const products = data ?? [];

  return (
    <>
      {showCreate && (
        <div className="mb-4">
          <ProductCreateInline
            onCancel={() => setShowCreate(false)}
            onCreated={() => setShowCreate(false)}
          />
        </div>
      )}

      {!showCreate && (
        <div className="mb-4 flex justify-end">
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowCreate(true)}
          >
            Nouveau produit
          </Button>
        </div>
      )}

      {products.length === 0 ? (
        <div className="catl-card text-center py-10">
          <p className="text-catl-text mb-4">Aucun produit enregistré.</p>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
            Créer le premier produit
          </Button>
        </div>
      ) : (
        <div className="catl-card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-catl-bg text-catl-text">
              <tr>
                <Th>Nom</Th>
                <Th>Catégorie</Th>
                <Th>EAN</Th>
                <Th>Unité</Th>
                <Th>Conservation</Th>
                <Th>Bio</Th>
                <Th>Producteur</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) =>
                editingId === p.id ? (
                  <ProductEditRow
                    key={p.id}
                    product={p}
                    producersMap={producersMap}
                    producersLoading={producersQuery.isLoading}
                    onSave={async (values) => {
                      try {
                        await updateMutation.mutateAsync({ id: p.id, values });
                        toast.success(`Produit "${values.name}" mis à jour.`);
                        setEditingId(null);
                      } catch (err) {
                        toast.error(err instanceof ApiError ? err.message : "Erreur");
                      }
                    }}
                    onCancel={() => setEditingId(null)}
                    saving={updateMutation.isPending}
                  />
                ) : (
                  <tr
                    key={p.id}
                    className="border-t border-gray-100 hover:bg-catl-bg/60 transition-colors"
                  >
                    <Td>
                      <span className="font-semibold text-catl-primary">{p.name}</span>
                    </Td>
                    <Td>{p.category ?? "—"}</Td>
                    <Td mono>{p.ean ?? "—"}</Td>
                    <Td mono>{p.unit}</Td>
                    <Td>
                      {p.storageType ? <ZoneTypeBadge type={p.storageType} /> : "—"}
                    </Td>
                    <Td>
                      {p.isBio ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          Bio
                        </span>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>{producersMap.get(p.producerId)?.name ?? p.producerId.slice(0, 8)}</Td>
                    <Td align="right">
                      <div className="inline-flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Pencil className="w-3.5 h-3.5" />}
                          onClick={() => setEditingId(p.id)}
                        >
                          Éditer
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                          className="text-catl-danger hover:bg-red-50"
                          onClick={() => setPendingDelete(p)}
                        >
                          Suppr.
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        title="Supprimer ce produit ?"
        description={
          pendingDelete && (
            <span>
              Le produit <strong>{pendingDelete.name}</strong> sera définitivement supprimé.
            </span>
          )
        }
        confirmLabel="Supprimer"
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!pendingDelete) return;
          try {
            await deleteMutation.mutateAsync(pendingDelete.id);
            toast.success(`Produit "${pendingDelete.name}" supprimé.`);
            setPendingDelete(null);
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Suppression impossible.");
            setPendingDelete(null);
          }
        }}
      />
    </>
  );
}

type EditRowProps = {
  product: Product;
  producersMap: Map<string, { id: string; name: string; province: string | null }>;
  producersLoading: boolean;
  onSave: (values: ProductCreateValues) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
};

function ProductEditRow({ product, producersMap, producersLoading, onSave, onCancel, saving }: EditRowProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductCreateInput, unknown, ProductCreateValues>({
    resolver: zodResolver(productCreateSchema),
    defaultValues: {
      name: product.name,
      category: product.category ?? "",
      unit: product.unit as ProductCreateValues["unit"],
      storageType: product.storageType ?? "DRY",
      producerId: product.producerId,
      isBio: product.isBio,
      certification: product.certification ?? null,
      ean: product.ean ?? null,
    },
  });

  return (
    <tr className="border-t border-catl-accent/30 bg-catl-bg/40">
      <td colSpan={8} className="px-4 py-3">
        <form
          onSubmit={handleSubmit(onSave)}
          noValidate
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          <Field label="Nom" required error={errors.name?.message}>
            <Input type="text" invalid={!!errors.name} {...register("name")} />
          </Field>
          <Field label="Catégorie" required error={errors.category?.message}>
            <Input type="text" invalid={!!errors.category} {...register("category")} />
          </Field>
          <Field label="Unité" required error={errors.unit?.message}>
            <Select invalid={!!errors.unit} {...register("unit")}>
              {UNIT_OPTIONS.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Conservation" required error={errors.storageType?.message}>
            <Select invalid={!!errors.storageType} {...register("storageType")}>
              {ZONE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Producteur" required error={errors.producerId?.message}>
            <Select invalid={!!errors.producerId} disabled={producersLoading} {...register("producerId")}>
              <option value="">— Sélectionner —</option>
              {Array.from(producersMap.values()).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="EAN" error={errors.ean?.message}>
            <Input type="text" invalid={!!errors.ean} {...register("ean")} />
          </Field>
          <Field label="Certification" error={errors.certification?.message}>
            <Input type="text" invalid={!!errors.certification} {...register("certification")} />
          </Field>
          <div className="flex items-end gap-2 pb-1">
            <label className="flex items-center gap-2 text-sm text-catl-text">
              <input type="checkbox" className="w-4 h-4 accent-catl-success" {...register("isBio")} />
              Bio
            </label>
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onCancel} leftIcon={<X className="w-3.5 h-3.5" />}>
                Annuler
              </Button>
              <Button type="submit" size="sm" loading={saving} leftIcon={<Check className="w-3.5 h-3.5" />}>
                Sauver
              </Button>
            </div>
          </div>
        </form>
      </td>
    </tr>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className={`px-4 py-3 text-xs font-bold uppercase tracking-wide text-${align === "right" ? "right" : "left"}`}>
      {children}
    </th>
  );
}

function Td({ children, align = "left", mono = false }: { children: React.ReactNode; align?: "left" | "right"; mono?: boolean }) {
  return (
    <td className={`px-4 py-3 align-middle text-${align === "right" ? "right" : "left"} ${mono ? "font-mono tabular-nums" : ""}`}>
      {children}
    </td>
  );
}
