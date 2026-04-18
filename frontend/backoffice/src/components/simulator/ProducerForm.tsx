"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Factory, Mail, MapPin, Tags, Target } from "lucide-react";
import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import {
  ApiError,
  useUpdateProducer,
} from "@/lib/simulator/api-hooks";
import { PRODUCTION_TYPES, type Producer } from "@/lib/simulator/types";
import { useSimulator } from "@/lib/simulator/state";
import { z } from "zod";

// Sous-schéma : uniquement les champs éditables via ce form. Lat/lon sont
// gérés via la carte (clic "Placer").
const producerIdentitySchema = z.object({
  name: z.string().trim().min(2, "Au moins 2 caractères").max(120),
  email: z.string().trim().email("Email invalide"),
  address: z.string().trim().max(300).optional(),
  trades: z.array(z.string().trim().min(1)).default([]),
});
type IdentityInput = z.input<typeof producerIdentitySchema>;
type IdentityValues = z.output<typeof producerIdentitySchema>;

export function ProducerForm({ producer }: { producer: Producer }) {
  const { state, dispatch } = useSimulator();
  const update = useUpdateProducer(producer.id);

  const form = useForm<IdentityInput, unknown, IdentityValues>({
    resolver: zodResolver(producerIdentitySchema),
    mode: "onBlur",
    defaultValues: {
      name: producer.name,
      email: producer.email,
      address: producer.address ?? "",
      trades: producer.trades ?? [],
    },
  });

  const {
    control,
    register,
    setValue,
    handleSubmit,
    formState: { errors, isDirty },
  } = form;

  // Resync le form si le producer change (sélection d'un autre dans le selector).
  const lastSyncedIdRef = useRef(producer.id);
  useEffect(() => {
    if (lastSyncedIdRef.current !== producer.id) {
      lastSyncedIdRef.current = producer.id;
      form.reset({
        name: producer.name,
        email: producer.email,
        address: producer.address ?? "",
        trades: producer.trades ?? [],
      });
    }
  }, [producer, form]);

  const trades = useWatch({ control, name: "trades" }) ?? [];

  const onSubmit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({
        name: values.name,
        email: values.email,
        address: values.address || undefined,
        // On garde lat/lon existants — la map les met à jour séparément.
        latitude: producer.latitude ?? undefined,
        longitude: producer.longitude ?? undefined,
        trades: values.trades,
      });
      toast.success("Identité du producteur mise à jour.");
      form.reset(values);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erreur de sauvegarde");
    }
  });

  const hasCoords =
    typeof producer.latitude === "number" &&
    typeof producer.longitude === "number";

  return (
    <form onSubmit={onSubmit} noValidate>
      <section className="catl-section catl-section--primary">
        <span className="catl-section-pill">
          <Factory className="w-3 h-3" /> Identité de la ferme
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nom" required error={errors.name?.message}>
            <Input invalid={!!errors.name} {...register("name")} />
          </Field>
          <Field label="Email" required error={errors.email?.message}>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-catl-text/50 pointer-events-none" />
              <Input
                type="email"
                className="pl-9"
                invalid={!!errors.email}
                {...register("email")}
              />
            </div>
          </Field>

          <div className="md:col-span-2">
            <Field
              label="Adresse du dépôt"
              error={errors.address?.message}
              hint={
                hasCoords
                  ? `📍 ${producer.latitude!.toFixed(5)}, ${producer.longitude!.toFixed(5)} — modifiable via la carte`
                  : "Cliquez « Placer » puis cliquez sur la carte pour poser le dépôt"
              }
            >
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-catl-text/50 pointer-events-none" />
                  <Input
                    type="text"
                    className="pl-9"
                    invalid={!!errors.address}
                    {...register("address")}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={state.pickMode ? "primary" : "secondary"}
                  onClick={() =>
                    dispatch({
                      type: "setPickMode",
                      pickMode: !state.pickMode,
                    })
                  }
                  leftIcon={<Target className="w-3.5 h-3.5" />}
                >
                  {state.pickMode ? "Clique sur la carte" : "Placer"}
                </Button>
              </div>
            </Field>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-catl-text mb-2 uppercase tracking-wide">
              <Tags className="inline w-3 h-3 mr-1" />
              Métiers
              {trades.length > 0 && (
                <span className="ml-2 text-catl-accent font-bold normal-case">
                  {trades.length} sélectionné{trades.length > 1 ? "s" : ""}
                </span>
              )}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRODUCTION_TYPES.map((t) => {
                const checked = trades.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    className={`catl-chip ${checked ? "catl-chip--active" : ""}`}
                    aria-pressed={checked}
                    onClick={() => {
                      const next = checked
                        ? trades.filter((x: string) => x !== t)
                        : [...trades, t];
                      setValue("trades", next, { shouldDirty: true });
                    }}
                  >
                    {checked && <Check className="w-3 h-3" />}
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-5">
          <Button
            type="submit"
            size="md"
            loading={update.isPending}
            disabled={!isDirty}
          >
            Enregistrer l&apos;identité
          </Button>
        </div>
      </section>
    </form>
  );
}
