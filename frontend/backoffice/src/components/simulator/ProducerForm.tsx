"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Factory, Leaf, Mail, MapPin } from "lucide-react";
import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { AddressAutocomplete } from "@/components/simulator/AddressAutocomplete";
import {
  useUpdateProducer,
  WmsApiError,
} from "@/lib/simulator/api-hooks";
import {
  producerFormSchema,
  type ProducerFormInput,
  type ProducerFormValues,
} from "@/lib/simulator/schemas";
import { type Producer } from "@/lib/simulator/types";

const PROVINCE_OPTIONS = [
  "Liège",
  "Hainaut",
  "Namur",
  "Luxembourg",
  "Brabant wallon",
  "Bruxelles",
] as const;

export function ProducerForm({ producer }: { producer: Producer }) {
  const update = useUpdateProducer(producer.id);

  const form = useForm<ProducerFormInput, unknown, ProducerFormValues>({
    resolver: zodResolver(producerFormSchema),
    mode: "onBlur",
    defaultValues: {
      name: producer.name,
      contact: producer.contact ?? "",
      address: producer.address ?? "",
      province: producer.province ?? "",
      isBio: producer.isBio ?? false,
    },
  });

  const {
    control,
    register,
    setValue,
    handleSubmit,
    formState: { errors, isDirty },
  } = form;

  // Resync si on change de producteur dans le selector.
  const lastSyncedIdRef = useRef(producer.id);
  useEffect(() => {
    if (lastSyncedIdRef.current !== producer.id) {
      lastSyncedIdRef.current = producer.id;
      form.reset({
        name: producer.name,
        contact: producer.contact ?? "",
        address: producer.address ?? "",
        province: producer.province ?? "",
        isBio: producer.isBio ?? false,
      });
    }
  }, [producer, form]);

  const address = useWatch({ control, name: "address" }) ?? "";
  const isBio = useWatch({ control, name: "isBio" });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({
        name: values.name,
        contact: values.contact || null,
        address: values.address || null,
        province: values.province || null,
        isBio: values.isBio,
      });
      toast.success("Producteur mis à jour.");
      form.reset(values);
    } catch (err) {
      toast.error(
        err instanceof WmsApiError ? err.message : "Erreur de sauvegarde",
      );
    }
  });

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
          <Field label="Contact" error={errors.contact?.message}>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-catl-text/50 pointer-events-none" />
              <Input
                type="text"
                placeholder="Nom + téléphone ou email"
                className="pl-9"
                invalid={!!errors.contact}
                {...register("contact")}
              />
            </div>
          </Field>

          <div className="md:col-span-2">
            <Field label="Adresse du dépôt" error={errors.address?.message}>
              <AddressAutocomplete
                value={address}
                onChangeText={(txt) =>
                  setValue("address", txt, { shouldDirty: true })
                }
                onPick={({ displayName }) => {
                  setValue("address", displayName, { shouldDirty: true });
                }}
                invalid={!!errors.address}
                leftIcon={
                  <MapPin className="w-4 h-4 text-catl-text/50" />
                }
              />
            </Field>
          </div>

          <Field label="Province" error={errors.province?.message}>
            <Select invalid={!!errors.province} {...register("province")}>
              <option value="">— Sélectionner —</option>
              {PROVINCE_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>

          <label
            className={`flex items-center gap-2.5 px-3 rounded-md border-2 cursor-pointer transition-colors self-end h-[42px] ${
              isBio
                ? "border-catl-success bg-catl-success/5"
                : "border-gray-200 hover:border-catl-success/40"
            }`}
          >
            <input
              type="checkbox"
              className="w-4 h-4 accent-catl-success"
              {...register("isBio")}
            />
            <Leaf className="w-4 h-4 text-catl-success shrink-0" />
            <span className="text-sm font-semibold text-catl-primary">
              Production bio
            </span>
          </label>
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
