"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { ZONE_TYPE_OPTIONS } from "@/components/ui/ZoneTypeBadge";
import { ApiError } from "@/lib/api";
import { useCreateZone, useUpdateZone } from "@/lib/hooks/zones";
import {
  zoneFormSchema,
  type ZoneFormInput,
  type ZoneFormValues,
} from "@/lib/schemas";
import type { StorageZone } from "@/lib/types";

type ZoneFormProps = {
  initialZone?: StorageZone;
};

export function ZoneForm({ initialZone }: ZoneFormProps) {
  const router = useRouter();
  const isEdit = !!initialZone;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ZoneFormInput, unknown, ZoneFormValues>({
    resolver: zodResolver(zoneFormSchema),
    mode: "onBlur",
    defaultValues: initialZone
      ? {
          name: initialZone.name,
          type: initialZone.type,
          targetTemp: initialZone.targetTemp,
          tempMin: initialZone.tempMin,
          tempMax: initialZone.tempMax,
        }
      : {
          name: "",
          type: "fresh",
          targetTemp: 4,
          tempMin: 0,
          tempMax: 7,
        },
  });

  const create = useCreateZone();
  const update = useUpdateZone(initialZone?.id ?? "");

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit && initialZone) {
        await update.mutateAsync(values);
        toast.success(`Zone "${values.name}" mise à jour.`);
        router.push(`/zones/${initialZone.id}`);
      } else {
        const created = await create.mutateAsync(values);
        toast.success(`Zone "${values.name}" créée.`);
        router.push(`/zones/${created.id}`);
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Erreur inattendue";
      toast.error(message);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card>
        <CardTitle>
          {isEdit ? `Modifier la zone "${initialZone?.name}"` : "Nouvelle zone"}
        </CardTitle>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field
            label="Nom de la zone"
            required
            error={errors.name?.message}
          >
            <Input
              type="text"
              placeholder="Ex. Frais A"
              invalid={!!errors.name}
              {...register("name")}
            />
          </Field>

          <Field label="Type" required error={errors.type?.message}>
            <Select invalid={!!errors.type} {...register("type")}>
              {ZONE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Température cible (°C)"
            required
            error={errors.targetTemp?.message}
          >
            <Input
              type="number"
              step="0.5"
              invalid={!!errors.targetTemp}
              {...register("targetTemp")}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Min (°C)"
              required
              error={errors.tempMin?.message}
            >
              <Input
                type="number"
                step="0.5"
                invalid={!!errors.tempMin}
                {...register("tempMin")}
              />
            </Field>
            <Field
              label="Max (°C)"
              required
              error={errors.tempMax?.message}
            >
              <Input
                type="number"
                step="0.5"
                invalid={!!errors.tempMax}
                {...register("tempMax")}
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8 pt-5 border-t border-gray-100">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            size="lg"
            loading={isSubmitting}
            disabled={!isValid && !isEdit}
          >
            {isEdit ? "Enregistrer" : "Valider la zone"}
          </Button>
        </div>
      </Card>
    </form>
  );
}
