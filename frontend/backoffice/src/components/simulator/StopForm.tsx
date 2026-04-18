"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Package } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { AddressAutocomplete } from "@/components/simulator/AddressAutocomplete";
import { CustomerPicker } from "@/components/simulator/CustomerPicker";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import {
  ApiError,
  useCreateStop,
  useCustomers,
  useUpdateStop,
} from "@/lib/simulator/api-hooks";
import {
  stopFormSchema,
  type StopFormInput,
  type StopFormValues,
} from "@/lib/simulator/schemas";
import {
  type ApiStop,
  type Customer,
  type StopCreate,
  type StopOperation,
  type StopUpdate,
} from "@/lib/simulator/types";

type Props = {
  producerId: string;
  routeId: string;
  stop?: ApiStop | null;
  onSaved?: (stop: ApiStop) => void;
  onCancel?: () => void;
};

export function StopForm({
  producerId,
  routeId,
  stop,
  onSaved,
  onCancel,
}: Props) {
  const isEdit = !!stop;
  const createStop = useCreateStop(routeId, producerId);
  const updateStop = useUpdateStop(routeId, stop?.id ?? "", producerId);

  // Pour récupérer le customer déjà lié en cas d'édition, on consulte le cache
  // des clients du producteur (fait dans le picker aussi).
  const { data: customersPage } = useCustomers(producerId, "");
  const initialCustomer: Customer | null = stop?.customerId
    ? (customersPage?.items ?? []).find((c) => c.id === stop.customerId) ?? null
    : null;

  const [mode, setMode] = useState<"customer" | "address">(
    stop?.customerId ? "customer" : "address",
  );
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    initialCustomer,
  );

  const form = useForm<StopFormInput, unknown, StopFormValues>({
    resolver: zodResolver(stopFormSchema),
    mode: "onBlur",
    defaultValues: {
      mode: stop?.customerId ? "customer" : "address",
      customerId: stop?.customerId ?? "",
      address: stop?.address ?? "",
      latitude: stop?.latitude ?? undefined,
      longitude: stop?.longitude ?? undefined,
      operation: stop?.operation ?? "delivery",
      amountEur: stop?.amountEur ?? 0,
      durationMin: stop?.durationMin ?? 15,
    },
  });

  const {
    control,
    register,
    handleSubmit,
    setValue,
    trigger,
    clearErrors,
    formState: { errors, isSubmitting },
  } = form;

  const switchMode = (next: "customer" | "address") => {
    setMode(next);
    setValue("mode", next);
    if (next === "customer") {
      setValue("address", "");
      setValue("latitude", undefined);
      setValue("longitude", undefined);
    } else {
      setValue("customerId", "");
      setSelectedCustomer(null);
    }
    // On efface les erreurs héritées de l'autre mode — la validation
    // repartira sur l'interaction utilisateur suivante.
    clearErrors(["customerId", "address", "latitude", "longitude"]);
  };

  const address = useWatch({ control, name: "address" });

  const onSubmit = handleSubmit(async (values) => {
    const base = {
      operation: values.operation as StopOperation,
      amountEur: values.amountEur,
      durationMin: values.durationMin,
    };
    const payload =
      values.mode === "customer"
        ? {
            ...base,
            customerId: values.customerId || undefined,
            // On envoie aussi l'adresse/coords du customer pour défensivement
            // garantir que la carte affiche l'arrêt même si le back ne les
            // reprend pas automatiquement.
            address: selectedCustomer?.address ?? undefined,
            latitude: selectedCustomer?.latitude ?? undefined,
            longitude: selectedCustomer?.longitude ?? undefined,
          }
        : {
            ...base,
            customerId: undefined,
            address: values.address,
            latitude: values.latitude,
            longitude: values.longitude,
          };
    try {
      const result = isEdit
        ? await updateStop.mutateAsync(payload satisfies StopUpdate)
        : await createStop.mutateAsync(payload satisfies StopCreate);
      toast.success(isEdit ? "Arrêt mis à jour." : "Arrêt ajouté.");
      onSaved?.(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(
          "Trajet verrouillé — duplique-le pour ajouter des arrêts.",
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
          <Package className="w-3 h-3" />{" "}
          {isEdit ? "Modifier l'arrêt" : "Nouvel arrêt"}
        </span>

        <div className="inline-flex rounded-md border border-gray-200 bg-white overflow-hidden mb-3 text-sm">
          <button
            type="button"
            onClick={() => switchMode("customer")}
            className={`px-3 py-1.5 transition-colors ${
              mode === "customer"
                ? "bg-catl-accent/10 text-catl-primary font-bold"
                : "text-catl-text hover:bg-catl-bg"
            }`}
          >
            Client existant
          </button>
          <button
            type="button"
            onClick={() => switchMode("address")}
            className={`px-3 py-1.5 border-l border-gray-200 transition-colors ${
              mode === "address"
                ? "bg-catl-accent/10 text-catl-primary font-bold"
                : "text-catl-text hover:bg-catl-bg"
            }`}
          >
            Adresse libre
          </button>
        </div>

        {mode === "customer" ? (
          <Field
            label="Client"
            required
            error={errors.customerId?.message || errors.address?.message}
          >
            <CustomerPicker
              producerId={producerId}
              selectedCustomer={selectedCustomer}
              onPick={(c) => {
                if (!c.id) {
                  // Cas spécial de reset envoyé par le picker quand l'utilisateur retape.
                  setSelectedCustomer(null);
                  setValue("customerId", "", { shouldValidate: true });
                  return;
                }
                setSelectedCustomer(c);
                setValue("customerId", c.id, { shouldValidate: true });
              }}
              invalid={!!errors.customerId || !!errors.address}
            />
          </Field>
        ) : (
          <Field
            label="Adresse"
            required
            error={errors.address?.message}
            hint="Sélectionne une suggestion pour récupérer les coordonnées."
          >
            <AddressAutocomplete
              value={address ?? ""}
              onChangeText={(t) => {
                setValue("address", t);
                setValue("latitude", undefined);
                setValue("longitude", undefined);
                void trigger(["address", "latitude", "longitude"]);
              }}
              onPick={(r) => {
                setValue("address", r.displayName);
                setValue("latitude", r.latitude);
                setValue("longitude", r.longitude);
                // Le refine de `stopFormSchema` remonte son erreur sur `address`
                // quand les coords manquent : on doit revalider l'ensemble pour
                // effacer l'erreur une fois lat/lon posés.
                void trigger(["address", "latitude", "longitude"]);
              }}
              invalid={!!errors.address}
              leftIcon={<MapPin className="w-4 h-4 text-catl-text/60" />}
            />
          </Field>
        )}

        {/* Opération cachée : seule la livraison est gérée côté produit. */}
        <input type="hidden" {...register("operation")} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <Field label="Montant (€)" error={errors.amountEur?.message}>
            <Input
              type="number"
              step="0.01"
              min="0"
              invalid={!!errors.amountEur}
              {...register("amountEur")}
            />
          </Field>
          <Field label="Durée (min)" error={errors.durationMin?.message}>
            <Input
              type="number"
              step="1"
              min="0"
              invalid={!!errors.durationMin}
              {...register("durationMin")}
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
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
          <Button type="submit" size="md" loading={isSubmitting}>
            {isEdit ? "Enregistrer" : "Ajouter l'arrêt"}
          </Button>
        </div>
      </div>
    </form>
  );
}
