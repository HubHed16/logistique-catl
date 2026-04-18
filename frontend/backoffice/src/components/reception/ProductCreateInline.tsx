"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { ZONE_TYPE_OPTIONS } from "@/components/ui/ZoneTypeBadge";
import { ApiError } from "@/lib/api";
import { useCreateProduct, useProducers } from "@/lib/hooks/products";
import {
  productCreateSchema,
  type ProductCreateInput,
  type ProductCreateValues,
} from "@/lib/schemas";
import type { Product } from "@/lib/types";

const UNIT_OPTIONS: { value: ProductCreateValues["unit"]; label: string }[] = [
  { value: "kg", label: "Kilogrammes" },
  { value: "piece", label: "Pièce" },
  { value: "liter", label: "Litre" },
  { value: "bunch", label: "Botte" },
  { value: "dozen", label: "Douzaine" },
  { value: "box", label: "Caisse" },
];

type Props = {
  prefillEan?: string;
  onCancel: () => void;
  onCreated: (product: Product) => void;
};

export function ProductCreateInline({ prefillEan, onCancel, onCreated }: Props) {
  const producersQuery = useProducers();
  const createMutation = useCreateProduct();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductCreateInput, unknown, ProductCreateValues>({
    resolver: zodResolver(productCreateSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      category: "",
      unit: "kg",
      storageType: "COLD",
      producerId: "",
      isBio: false,
      certification: null,
      ean: prefillEan ?? null,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const product = await createMutation.mutateAsync(values);
      toast.success(`Produit "${product.name}" créé.`);
      onCreated(product);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Création impossible";
      toast.error(msg);
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="bg-catl-bg/60 rounded-md p-4 space-y-4 border border-gray-100"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase text-catl-primary tracking-wide">
          Créer une fiche produit
          {prefillEan && (
            <span className="ml-2 font-mono text-catl-text normal-case">
              ({prefillEan})
            </span>
          )}
        </h4>
      </div>

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

        <Field label="Producteur" required error={errors.producerId?.message}>
          <Select
            invalid={!!errors.producerId}
            disabled={producersQuery.isLoading}
            {...register("producerId")}
          >
            <option value="">— Sélectionner —</option>
            {(producersQuery.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.province})
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

        <label className="flex items-center gap-2 text-sm text-catl-text mt-7">
          <input
            type="checkbox"
            className="w-4 h-4 accent-catl-success"
            {...register("isBio")}
          />
          Produit biologique
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Annuler
        </Button>
        <Button type="submit" size="sm" loading={isSubmitting}>
          Créer le produit
        </Button>
      </div>
    </form>
  );
}
