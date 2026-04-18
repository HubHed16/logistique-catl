"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Route as RouteIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import {
  ApiError,
  useCreateRoute,
  useUpdateRoute,
  useVehicles,
} from "@/lib/simulator/api-hooks";
import {
  routeFormSchema,
  type RouteFormInput,
  type RouteFormValues,
} from "@/lib/simulator/schemas";
import {
  DAY_LABELS,
  VEHICLE_TYPE_LABELS,
  type ApiRoute,
  type DayOfWeek,
  type RouteCreate,
  type RouteUpdate,
} from "@/lib/simulator/types";

type Props = {
  producerId: string;
  route?: ApiRoute | null;
  onSaved?: (route: ApiRoute) => void;
  onCancel?: () => void;
};

function toForm(r: ApiRoute | null | undefined): RouteFormValues {
  return {
    name: r?.name ?? "",
    vehicleId: r?.vehicleId ?? "",
    dayOfWeek: r?.dayOfWeek ?? "",
    scheduledDate: r?.scheduledDate ?? "",
  };
}

export function RouteForm({ producerId, route, onSaved, onCancel }: Props) {
  const create = useCreateRoute();
  const update = useUpdateRoute(producerId, route?.id ?? "");
  const { data: vehiclesPage } = useVehicles(producerId);
  const isEdit = !!route;

  const form = useForm<RouteFormInput, unknown, RouteFormValues>({
    resolver: zodResolver(routeFormSchema),
    mode: "onBlur",
    defaultValues: toForm(route),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = form;

  const vehicles = vehiclesPage?.items ?? [];

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      vehicleId: values.vehicleId ? values.vehicleId : undefined,
      dayOfWeek: (values.dayOfWeek || undefined) as DayOfWeek | undefined,
      scheduledDate: values.scheduledDate ? values.scheduledDate : undefined,
    };
    try {
      const result = isEdit
        ? await update.mutateAsync(payload satisfies RouteUpdate)
        : await create.mutateAsync({
            producerId,
            ...payload,
          } satisfies RouteCreate);
      toast.success(isEdit ? "Trajet mis à jour." : "Trajet créé.");
      onSaved?.(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(
          "Trajet verrouillé — duplique-le pour continuer l'édition.",
        );
        return;
      }
      toast.error(err instanceof ApiError ? err.message : "Erreur de sauvegarde");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="catl-section catl-section--info">
        <span className="catl-section-pill">
          <RouteIcon className="w-3 h-3" />{" "}
          {isEdit ? "Modifier le trajet" : "Nouveau trajet"}
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
          <Field label="Nom du trajet" required error={errors.name?.message}>
            <Input
              placeholder="Tournée Liège centre"
              invalid={!!errors.name}
              {...register("name")}
            />
          </Field>
          <Field label="Véhicule">
            <Select {...register("vehicleId")}>
              <option value="">— Aucun —</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {VEHICLE_TYPE_LABELS[v.type]}
                  {v.refrigerated ? " (réfrigéré)" : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Jour de la semaine">
            <Select {...register("dayOfWeek")}>
              <option value="">— Aucun —</option>
              {(Object.keys(DAY_LABELS) as DayOfWeek[]).map((d) => (
                <option key={d} value={d}>
                  {DAY_LABELS[d]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date prévue" error={errors.scheduledDate?.message}>
            <Input
              type="date"
              invalid={!!errors.scheduledDate}
              {...register("scheduledDate")}
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 mt-3">
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
            disabled={!isDirty && isEdit}
          >
            {isEdit ? "Enregistrer" : "Créer le trajet"}
          </Button>
        </div>
      </div>
    </form>
  );
}
