"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Plus, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { ApiError, useCreateProducer, useProducers } from "@/lib/simulator/api-hooks";
import {
  producerFormSchema,
  type ProducerFormInput,
  type ProducerFormValues,
} from "@/lib/simulator/schemas";
import { DEFAULT_MAP_CENTER } from "@/lib/simulator/types";
import { useSimulator } from "@/lib/simulator/state";

export function ProducerSelector() {
  const { state, dispatch } = useSimulator();
  const { data, isLoading, isError } = useProducers();
  const createMutation = useCreateProducer();

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Ferme le dropdown au clic extérieur
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const current =
    data?.items?.find((p) => p.id === state.currentProducerId) ?? null;

  const form = useForm<ProducerFormInput, unknown, ProducerFormValues>({
    resolver: zodResolver(producerFormSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      email: "",
      address: "",
      latitude: DEFAULT_MAP_CENTER[0],
      longitude: DEFAULT_MAP_CENTER[1],
      trades: [],
    },
  });

  const onCreate = form.handleSubmit(async (values) => {
    try {
      const created = await createMutation.mutateAsync({
        name: values.name,
        email: values.email,
        address: values.address || undefined,
        latitude: values.latitude,
        longitude: values.longitude,
        trades: values.trades,
      });
      if (created.id) {
        dispatch({
          type: "setCurrentProducer",
          producerId: created.id,
        });
      }
      toast.success(`Producteur « ${created.name} » créé.`);
      form.reset();
      setCreating(false);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Création impossible");
    }
  });

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full md:w-auto min-w-[260px] flex items-center justify-between gap-2 px-4 py-2 rounded-full bg-white border border-catl-primary/20 hover:border-catl-accent text-sm shadow-sm transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-catl-primary">
          <Users className="w-4 h-4 text-catl-accent" />
          <span className="font-semibold">
            {current ? current.name : "Choisir un producteur"}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(420px,90vw)] bg-white rounded-md shadow-xl border border-catl-primary/10 z-50 p-2">
          {isLoading && (
            <div className="p-3 text-sm text-catl-text">Chargement...</div>
          )}
          {isError && (
            <div className="p-3 text-sm text-catl-danger">
              Impossible de charger les producteurs.
            </div>
          )}
          {!isLoading && !isError && (
            <>
              {(data?.items ?? []).length === 0 && (
                <div className="p-3 text-sm text-catl-text italic">
                  Aucun producteur enregistré.
                </div>
              )}
              <ul className="max-h-64 overflow-y-auto">
                {(data?.items ?? []).map((p) => {
                  const active = p.id === state.currentProducerId;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          dispatch({
                            type: "setCurrentProducer",
                            producerId: p.id ?? null,
                          });
                          setOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          active
                            ? "bg-catl-accent/10 text-catl-accent font-semibold"
                            : "hover:bg-catl-bg text-catl-primary"
                        }`}
                      >
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-catl-text">{p.email}</div>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="border-t border-gray-100 mt-2 pt-2">
                {!creating ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => setCreating(true)}
                    className="w-full justify-start"
                  >
                    Nouveau producteur
                  </Button>
                ) : (
                  <form onSubmit={onCreate} noValidate className="space-y-3">
                    <Field
                      label="Nom"
                      required
                      error={form.formState.errors.name?.message}
                    >
                      <Input
                        placeholder="Ex : Ferme du Soleil"
                        invalid={!!form.formState.errors.name}
                        {...form.register("name")}
                      />
                    </Field>
                    <Field
                      label="Email"
                      required
                      error={form.formState.errors.email?.message}
                    >
                      <Input
                        type="email"
                        placeholder="contact@ferme.com"
                        invalid={!!form.formState.errors.email}
                        {...form.register("email")}
                      />
                    </Field>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          form.reset();
                          setCreating(false);
                        }}
                      >
                        Annuler
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        loading={createMutation.isPending}
                      >
                        Créer
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
