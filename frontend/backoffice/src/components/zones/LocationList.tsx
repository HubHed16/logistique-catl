"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, Input } from "@/components/ui/Field";
import { ApiError } from "@/lib/api";
import {
  useCreateLocation,
  useDeleteLocation,
  useZoneLocations,
} from "@/lib/hooks/zones";
import {
  locationFormSchema,
  type LocationFormInput,
  type LocationFormValues,
} from "@/lib/schemas";
import type { StorageLocation } from "@/lib/types";

type LocationListProps = {
  zoneId: string;
};

export function LocationList({ zoneId }: LocationListProps) {
  const { data, isLoading, isError } = useZoneLocations(zoneId);
  const createMutation = useCreateLocation(zoneId);
  const deleteMutation = useDeleteLocation(zoneId);
  const [pendingDelete, setPendingDelete] = useState<StorageLocation | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LocationFormInput, unknown, LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    mode: "onBlur",
    defaultValues: { label: "", rack: "", position: "", temperature: null },
  });

  const onAdd = handleSubmit(async (values) => {
    try {
      await createMutation.mutateAsync(values);
      toast.success(`Emplacement "${values.label}" ajouté.`);
      reset({ label: "", rack: "", position: "", temperature: null });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur d'ajout";
      toast.error(msg);
    }
  });

  return (
    <>
      <div className="space-y-4">
        {isLoading && (
          <div className="text-sm text-catl-text">Chargement...</div>
        )}

        {isError && (
          <div className="text-sm text-catl-danger">
            Impossible de charger les emplacements.
          </div>
        )}

        {!isLoading && !isError && (
          <>
            {(data ?? []).length === 0 ? (
              <p className="text-sm text-catl-text italic">
                Aucun emplacement dans cette zone pour le moment.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-md overflow-hidden">
                {(data ?? []).map((loc) => (
                  <li
                    key={loc.id}
                    className="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-catl-bg/60 transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-catl-primary">
                        {loc.label}
                      </div>
                      <div className="text-xs text-catl-text">
                        Rack {loc.rack} · Position {loc.position}
                        {loc.temperature !== null && (
                          <> · {loc.temperature.toFixed(1)} °C</>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-catl-danger hover:bg-red-50"
                      onClick={() => setPendingDelete(loc)}
                      leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                      aria-label={`Supprimer ${loc.label}`}
                    >
                      Suppr.
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <form
          onSubmit={onAdd}
          noValidate
          className="bg-catl-bg/60 rounded-md p-4 space-y-4 border border-gray-100"
        >
          <h4 className="text-xs font-bold uppercase text-catl-primary tracking-wide">
            Ajouter un emplacement
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <Field
                label="Libellé"
                required
                error={errors.label?.message}
              >
                <Input
                  type="text"
                  placeholder="Ex. Frais A · R1 · P1"
                  invalid={!!errors.label}
                  {...register("label")}
                />
              </Field>
            </div>
            <Field
              label="Rack"
              required
              error={errors.rack?.message}
            >
              <Input
                type="text"
                placeholder="R1"
                invalid={!!errors.rack}
                {...register("rack")}
              />
            </Field>
            <Field
              label="Position"
              required
              error={errors.position?.message}
            >
              <Input
                type="text"
                placeholder="P1"
                invalid={!!errors.position}
                {...register("position")}
              />
            </Field>

            <div className="md:col-span-2">
              <Field
                label="Température mesurée (°C)"
                hint="Optionnel — sonde manuelle"
                error={errors.temperature?.message}
              >
                <Input
                  type="number"
                  step="0.1"
                  invalid={!!errors.temperature}
                  {...register("temperature")}
                />
              </Field>
            </div>

            <div className="md:col-span-2 flex items-end justify-end">
              <Button type="submit" loading={isSubmitting}>
                Ajouter l&apos;emplacement
              </Button>
            </div>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Supprimer cet emplacement ?"
        description={
          pendingDelete && (
            <span>
              L&apos;emplacement{" "}
              <strong>{pendingDelete.label}</strong> sera supprimé.
            </span>
          )
        }
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!pendingDelete) return;
          try {
            await deleteMutation.mutateAsync(pendingDelete.id);
            toast.success(`Emplacement "${pendingDelete.label}" supprimé.`);
            setPendingDelete(null);
          } catch (err) {
            const msg =
              err instanceof ApiError ? err.message : "Suppression impossible.";
            toast.error(msg);
            setPendingDelete(null);
          }
        }}
      />
    </>
  );
}
