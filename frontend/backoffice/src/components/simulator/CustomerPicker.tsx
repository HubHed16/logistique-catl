"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Plus, Search, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { AddressAutocomplete } from "@/components/simulator/AddressAutocomplete";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import {
  ApiError,
  useCreateCustomer,
  useCustomers,
} from "@/lib/simulator/api-hooks";
import {
  customerFormSchema,
  type CustomerFormInput,
  type CustomerFormValues,
} from "@/lib/simulator/schemas";
import {
  CUSTOMER_TYPE_LABELS,
  type Customer,
  type CustomerType,
} from "@/lib/simulator/types";

type Props = {
  producerId: string;
  selectedCustomer: Customer | null;
  onPick: (customer: Customer) => void;
  invalid?: boolean;
};

export function CustomerPicker({
  producerId,
  selectedCustomer,
  onPick,
  invalid,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const debouncedQuery = useDebouncedValue(query, 250);
  const { data, isFetching } = useCustomers(producerId, debouncedQuery);
  const customers = data?.items ?? [];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const displayValue = selectedCustomer
    ? selectedCustomer.name
    : query;

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-catl-text/60 pointer-events-none" />
        <input
          type="text"
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (selectedCustomer) {
              // Typer efface la sélection pour pouvoir chercher à nouveau.
              onPick({
                ...selectedCustomer,
                id: "",
              });
            }
          }}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher un client…"
          aria-invalid={invalid || undefined}
          className={`w-full rounded-md border-2 text-sm px-3 py-2 pl-9 transition-colors focus:outline-none focus:ring-2 focus:ring-catl-accent/20 ${
            invalid
              ? "border-catl-danger bg-red-50"
              : "border-gray-200 focus:border-catl-accent"
          }`}
        />
      </div>

      {selectedCustomer && selectedCustomer.id && (
        <div className="mt-2 text-xs text-catl-text flex items-center gap-2">
          <Users className="w-3 h-3 text-catl-info" />
          <span className="font-semibold text-catl-primary">
            {selectedCustomer.name}
          </span>
          {selectedCustomer.type && (
            <span className="px-1.5 py-0.5 rounded bg-catl-bg text-catl-text text-[10px]">
              {CUSTOMER_TYPE_LABELS[selectedCustomer.type]}
            </span>
          )}
          {selectedCustomer.address && (
            <span className="truncate">{selectedCustomer.address}</span>
          )}
        </div>
      )}

      {open && !creating && (
        <div className="absolute left-0 right-0 mt-1 bg-white rounded-md shadow-xl border border-catl-primary/10 z-40 max-h-72 overflow-y-auto">
          {isFetching && customers.length === 0 && (
            <div className="p-3 text-sm text-catl-text">Recherche…</div>
          )}
          {!isFetching && customers.length === 0 && (
            <div className="p-3 text-sm text-catl-text italic">
              Aucun client trouvé{debouncedQuery ? ` pour « ${debouncedQuery} »` : ""}.
            </div>
          )}
          {customers.length > 0 && (
            <ul role="listbox">
              {customers.map((c) => (
                <li key={c.id} role="option">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onPick(c);
                      setQuery("");
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-catl-bg"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-catl-primary truncate">
                        {c.name}
                      </span>
                      {c.type && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-catl-bg text-catl-text shrink-0">
                          {CUSTOMER_TYPE_LABELS[c.type]}
                        </span>
                      )}
                    </div>
                    {c.address && (
                      <div className="text-xs text-catl-text truncate">
                        {c.address}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setCreating(true);
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm border-t border-gray-100 text-catl-accent hover:bg-catl-bg flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Créer un nouveau client
          </button>
        </div>
      )}

      {creating && (
        <NewCustomerInlineForm
          producerId={producerId}
          initialName={query}
          onCreated={(c) => {
            setCreating(false);
            setQuery("");
            onPick(c);
          }}
          onCancel={() => setCreating(false)}
        />
      )}
    </div>
  );
}

function NewCustomerInlineForm({
  producerId,
  initialName,
  onCreated,
  onCancel,
}: {
  producerId: string;
  initialName: string;
  onCreated: (c: Customer) => void;
  onCancel: () => void;
}) {
  const createCustomer = useCreateCustomer();

  const form = useForm<CustomerFormInput, unknown, CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    mode: "onBlur",
    defaultValues: {
      name: initialName,
      type: "",
      address: "",
      latitude: undefined as unknown as number,
      longitude: undefined as unknown as number,
      contactEmail: "",
      contactPhone: "",
      deliveryHours: "",
      notes: "",
    },
  });

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const address = useWatch({ control, name: "address" });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const created = await createCustomer.mutateAsync({
        producerId,
        name: values.name,
        type: (values.type || undefined) as CustomerType | undefined,
        address: values.address,
        latitude: values.latitude,
        longitude: values.longitude,
        contactEmail: values.contactEmail || undefined,
        contactPhone: values.contactPhone || undefined,
        deliveryHours: values.deliveryHours || undefined,
        notes: values.notes || undefined,
      });
      toast.success("Client créé.");
      onCreated(created);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Création impossible");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mt-2">
      <div className="catl-section catl-section--info">
        <span className="catl-section-pill">
          <Plus className="w-3 h-3" /> Nouveau client
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <Field label="Nom" required error={errors.name?.message}>
            <Input
              autoFocus
              invalid={!!errors.name}
              {...register("name")}
            />
          </Field>
          <Field label="Type">
            <Select {...register("type")}>
              <option value="">— Aucun —</option>
              {(
                Object.keys(CUSTOMER_TYPE_LABELS) as CustomerType[]
              ).map((t) => (
                <option key={t} value={t}>
                  {CUSTOMER_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field
          label="Adresse"
          required
          error={errors.address?.message || errors.latitude?.message}
          hint="Sélectionne une suggestion pour récupérer les coordonnées."
        >
          <AddressAutocomplete
            value={address ?? ""}
            onChangeText={(t) => {
              setValue("address", t, { shouldValidate: true });
              setValue("latitude", undefined as unknown as number, {
                shouldValidate: true,
              });
              setValue("longitude", undefined as unknown as number, {
                shouldValidate: true,
              });
            }}
            onPick={(r) => {
              setValue("address", r.displayName, { shouldValidate: true });
              setValue("latitude", r.latitude, { shouldValidate: true });
              setValue("longitude", r.longitude, { shouldValidate: true });
            }}
            invalid={!!errors.address || !!errors.latitude}
            leftIcon={<MapPin className="w-4 h-4 text-catl-text/60" />}
          />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <Field label="Email" error={errors.contactEmail?.message}>
            <Input
              type="email"
              invalid={!!errors.contactEmail}
              {...register("contactEmail")}
            />
          </Field>
          <Field label="Téléphone">
            <Input {...register("contactPhone")} />
          </Field>
        </div>
        <div className="flex items-center justify-end gap-2 mt-3">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button type="submit" size="md" loading={isSubmitting}>
            Créer le client
          </Button>
        </div>
      </div>
    </form>
  );
}
