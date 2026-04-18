"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Snowflake, Truck, User } from "lucide-react";
import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import {
  ApiError,
  useCreateVehicle,
  useUpdateVehicle,
  useVehicles,
} from "@/lib/simulator/api-hooks";
import {
  vehicleFormSchema,
  type VehicleFormInput,
  type VehicleFormValues,
} from "@/lib/simulator/schemas";
import {
  DRIVER_LABELS,
  FUEL_LABELS,
  VEHICLE_TYPE_LABELS,
} from "@/lib/simulator/types";

type Props = { producerId: string };

const DEFAULTS: VehicleFormValues = {
  type: "van",
  fuel: "diesel",
  refrigerated: false,
  driverType: "owner",
  consumptionL100Km: 8.5,
  fuelPrice: 1.75,
  amortizationEurKm: 0.25,
  hourlyCost: 18,
  prepTimeMin: 30,
  loadingTimeMin: 20,
};

export function VehicleForm({ producerId }: Props) {
  const { data, isLoading } = useVehicles(producerId);
  const create = useCreateVehicle();
  const vehicle = data?.items?.[0] ?? null;
  const update = useUpdateVehicle(producerId, vehicle?.id ?? "");

  const form = useForm<VehicleFormInput, unknown, VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    mode: "onBlur",
    defaultValues: DEFAULTS,
  });

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = form;

  // Resync quand data arrive ou change de producer
  const lastVehicleIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!vehicle) {
      if (lastVehicleIdRef.current !== null) {
        lastVehicleIdRef.current = null;
        form.reset(DEFAULTS);
      }
      return;
    }
    if (lastVehicleIdRef.current !== vehicle.id) {
      lastVehicleIdRef.current = vehicle.id;
      form.reset({
        type: vehicle.type,
        fuel: vehicle.fuel,
        refrigerated: vehicle.refrigerated,
        driverType: vehicle.driverType ?? "owner",
        consumptionL100Km: vehicle.consumptionL100Km ?? DEFAULTS.consumptionL100Km,
        fuelPrice: vehicle.fuelPrice ?? DEFAULTS.fuelPrice,
        amortizationEurKm: vehicle.amortizationEurKm ?? DEFAULTS.amortizationEurKm,
        hourlyCost: vehicle.hourlyCost ?? DEFAULTS.hourlyCost,
        prepTimeMin: vehicle.prepTimeMin,
        loadingTimeMin: vehicle.loadingTimeMin,
      });
    }
  }, [vehicle, form]);

  const refrigerated = useWatch({ control, name: "refrigerated" });

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (vehicle) {
        await update.mutateAsync(values);
        toast.success("Véhicule mis à jour.");
      } else {
        await create.mutateAsync({
          producerId,
          ...values,
        });
        toast.success("Véhicule créé.");
      }
      form.reset(values);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erreur de sauvegarde");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <section className="catl-section catl-section--info">
        <span className="catl-section-pill">
          <Truck className="w-3 h-3" /> Véhicule & organisation
        </span>

        {isLoading ? (
          <div className="text-sm text-catl-text">Chargement...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
              <Field label="Type de véhicule" required>
                <Select {...register("type")}>
                  {(Object.keys(VEHICLE_TYPE_LABELS) as Array<
                    keyof typeof VEHICLE_TYPE_LABELS
                  >).map((v) => (
                    <option key={v} value={v}>
                      {VEHICLE_TYPE_LABELS[v]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Énergie" required>
                <Select {...register("fuel")}>
                  {(Object.keys(FUEL_LABELS) as Array<keyof typeof FUEL_LABELS>).map(
                    (v) => (
                      <option key={v} value={v}>
                        {FUEL_LABELS[v]}
                      </option>
                    ),
                  )}
                </Select>
              </Field>
              <label
                className={`flex items-center gap-2.5 px-3 rounded-md border-2 cursor-pointer transition-colors self-end h-[42px] whitespace-nowrap ${
                  refrigerated
                    ? "border-catl-info bg-catl-info/5"
                    : "border-gray-200 hover:border-catl-info/40"
                }`}
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-catl-info"
                  {...register("refrigerated")}
                />
                <Snowflake className="w-4 h-4 text-catl-info shrink-0" />
                <span className="text-sm font-semibold text-catl-primary">
                  Réfrigéré
                </span>
              </label>
              <Field
                label="Conso (L ou kWh / 100 km)"
                error={errors.consumptionL100Km?.message}
              >
                <Input
                  type="number"
                  step="0.1"
                  invalid={!!errors.consumptionL100Km}
                  {...register("consumptionL100Km")}
                />
              </Field>
              <Field
                label="Prix (€/L ou €/kWh)"
                error={errors.fuelPrice?.message}
              >
                <Input
                  type="number"
                  step="0.01"
                  invalid={!!errors.fuelPrice}
                  {...register("fuelPrice")}
                />
              </Field>
              <Field
                label="Amort. / entretien (€/km)"
                error={errors.amortizationEurKm?.message}
              >
                <Input
                  type="number"
                  step="0.01"
                  invalid={!!errors.amortizationEurKm}
                  {...register("amortizationEurKm")}
                />
              </Field>
            </div>

            <div className="border-t border-gray-100 pt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <Field label="Qui livre ?" required>
                <Select {...register("driverType")}>
                  {(Object.keys(DRIVER_LABELS) as Array<
                    keyof typeof DRIVER_LABELS
                  >).map((v) => (
                    <option key={v} value={v}>
                      {DRIVER_LABELS[v]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Coût personnel (€/h)" error={errors.hourlyCost?.message}>
                <Input
                  type="number"
                  step="0.5"
                  invalid={!!errors.hourlyCost}
                  {...register("hourlyCost")}
                />
              </Field>
              <Field label="Prépa. (min)" error={errors.prepTimeMin?.message}>
                <Input
                  type="number"
                  step="1"
                  invalid={!!errors.prepTimeMin}
                  {...register("prepTimeMin")}
                />
              </Field>
              <Field
                label="Chargement (min)"
                error={errors.loadingTimeMin?.message}
              >
                <Input
                  type="number"
                  step="1"
                  invalid={!!errors.loadingTimeMin}
                  {...register("loadingTimeMin")}
                />
              </Field>
            </div>

            <div className="flex items-center justify-between mt-5 flex-wrap gap-2">
              <div className="text-xs text-catl-text flex items-center gap-1">
                <User className="w-3 h-3" />
                {vehicle
                  ? "Édition du véhicule par défaut de ce producteur."
                  : "Aucun véhicule encore — enregistrer crée le premier."}
              </div>
              <Button
                type="submit"
                size="md"
                loading={create.isPending || update.isPending}
                disabled={!isDirty}
              >
                {vehicle ? "Enregistrer le véhicule" : "Créer le véhicule"}
              </Button>
            </div>
          </>
        )}
      </section>
    </form>
  );
}
