"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Package } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { ZONE_TYPE_OPTIONS } from "@/components/ui/ZoneTypeBadge";
import {
  CatalogApiError,
  useSaveProducerProduct,
  type CatalogProductInput,
} from "@/lib/simulator/catalog-api";
import {
  productCreateSchema,
  type ProductCreateInput,
  type ProductCreateValues,
} from "@/lib/schemas";
import type { Product } from "@/lib/types";

type Props = {
  producerId: string;
  product?: Product | null;
  onSaved?: (product: Product) => void;
  onCancel?: () => void;
};

const UNIT_OPTIONS: { value: ProductCreateValues["unit"]; label: string }[] = [
  { value: "kg", label: "Kilogrammes" },
  { value: "piece", label: "Pièce" },
  { value: "liter", label: "Litre" },
  { value: "bunch", label: "Botte" },
  { value: "dozen", label: "Douzaine" },
  { value: "box", label: "Caisse" },
];

function toDefaults(
  producerId: string,
  product: Product | null | undefined,
): ProductCreateInput {
  if (!product) {
    return {
      name: "",
      category: "",
      unit: "kg",
      storageType: "fresh",
      producerId,
      isBio: false,
      certification: null,
      ean: null,
    };
  }
  return {
    name: product.name,
    category: product.category ?? "",
    unit: product.unit as ProductCreateValues["unit"],
    storageType: product.storageType ?? "fresh",
    producerId,
    isBio: product.isBio,
    certification: product.certification ?? null,
    ean: product.ean ?? null,
  };
}

export function ProducerCatalogForm({
  producerId,
  product,
  onSaved,
  onCancel,
}: Props) {
  const save = useSaveProducerProduct(producerId);
  const isEdit = !!product;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProductCreateInput, unknown, ProductCreateValues>({
    resolver: zodResolver(productCreateSchema),
    mode: "onBlur",
    defaultValues: toDefaults(producerId, product),
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const input: CatalogProductInput = {
        id: product?.id,
        producerId,
        name: values.name,
        category: values.category,
        unit: values.unit,
        storageType: values.storageType,
        isBio: values.isBio,
        certification: values.certification ?? null,
        ean: values.ean ?? null,
      };
      const saved = await save.mutateAsync(input);
      toast.success(isEdit ? "Produit mis à jour." : `Produit "${saved.name}" créé.`);
      onSaved?.(saved);
    } catch (err) {
      const msg =
        err instanceof CatalogApiError ? err.message : "Sauvegarde impossible";
      toast.error(msg);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="catl-section catl-section--info">
        <span className="catl-section-pill">
          <Package className="w-3 h-3" />{" "}
          {isEdit ? "Modifier le produit" : "Nouveau produit"}
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Nom" required error={errors.name?.message}>
            <Input
              type="text"
              placeholder="Ex. Carottes bio"
              invalid={!!errors.name}
              {...register("name")}
            />
          </Field>
          <Field label="Catégorie" required error={errors.category?.message}>
            <Input
              type="text"
              placeholder="Ex. Légumes-racines"
              invalid={!!errors.category}
              {...register("category")}
            />
          </Field>

          <Field label="Unité" required error={errors.unit?.message}>
            <Select invalid={!!errors.unit} {...register("unit")}>
              {UNIT_OPTIONS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Conservation"
            required
            error={errors.storageType?.message}
          >
            <Select invalid={!!errors.storageType} {...register("storageType")}>
              {ZONE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Certification"
            hint="Ex. Certisys, Biogarantie — laisser vide si aucune."
            error={errors.certification?.message}
          >
            <Input
              type="text"
              placeholder="Certisys"
              invalid={!!errors.certification}
              {...register("certification")}
            />
          </Field>

          <Field label="EAN" error={errors.ean?.message}>
            <Input
              type="text"
              placeholder="3760000000000"
              invalid={!!errors.ean}
              {...register("ean")}
            />
          </Field>

          <label className="flex items-center gap-2 text-sm text-catl-text md:col-span-2">
            <input
              type="checkbox"
              className="w-4 h-4 accent-catl-success"
              {...register("isBio")}
            />
            Produit biologique
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
          )}
          <Button
            type="submit"
            size="md"
            loading={isSubmitting}
            disabled={isEdit && !isDirty}
          >
            {isEdit ? "Enregistrer" : "Créer le produit"}
          </Button>
        </div>
      </div>
    </form>
  );
}
