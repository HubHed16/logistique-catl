"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  ChevronDown,
  Leaf,
  Mail,
  MapPin,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { AddressAutocomplete } from "@/components/simulator/AddressAutocomplete";
import {
  useCreateProducer,
  useProducer,
  useProducers,
  WmsApiError,
} from "@/lib/simulator/api-hooks";
import {
  producerFormSchema,
  type ProducerFormInput,
  type ProducerFormValues,
} from "@/lib/simulator/schemas";
import { type Producer } from "@/lib/simulator/types";
import { useSimulator } from "@/lib/simulator/state";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";

const PROVINCE_OPTIONS = [
  "Liège",
  "Hainaut",
  "Namur",
  "Luxembourg",
  "Brabant wallon",
  "Bruxelles",
] as const;

export function ProducerSelector() {
  const { state, dispatch } = useSimulator();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"list" | "create">("list");
  const [rawQuery, setRawQuery] = useState("");
  const debouncedQuery = useDebouncedValue(rawQuery, 200);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const query = useProducers();
  const { data, isLoading, isError } = query;

  // Filtre client-side — wms-api ne fournit pas de recherche serveur.
  const items = useMemo<Producer[]>(() => {
    const all = data ?? [];
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return all;
    return all.filter((p) => {
      const bag = [p.name, p.contact ?? "", p.address ?? "", p.province ?? ""]
        .join(" ")
        .toLowerCase();
      return bag.includes(q);
    });
  }, [data, debouncedQuery]);
  const total = data?.length ?? 0;

  // Fallback : si le producteur actif a été supprimé ou s'il n'est pas
  // dans la page chargée, on va chercher ses infos directement côté wms
  // pour garder le nom visible dans le bouton.
  const currentProducerQuery = useProducer(state.currentProducerId);
  const current = useMemo(() => {
    if (!state.currentProducerId) return null;
    const all = data ?? [];
    const inList = all.find((p) => p.id === state.currentProducerId);
    return inList ?? currentProducerQuery.data ?? null;
  }, [data, state.currentProducerId, currentProducerQuery.data]);

  // Ferme au clic extérieur
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setMode("list");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Focus l'input à l'ouverture (mode liste) + Esc ferme.
  useEffect(() => {
    if (!open) return;
    const id =
      mode === "list"
        ? window.setTimeout(() => searchInputRef.current?.focus(), 50)
        : 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setMode("list");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      if (id) window.clearTimeout(id);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, mode]);

  const highlightClass = (active: boolean) =>
    active
      ? "bg-catl-accent/10 border-l-2 border-catl-accent"
      : "hover:bg-catl-bg border-l-2 border-transparent";

  return (
    <div className="relative w-full md:w-auto" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full md:w-auto md:min-w-[260px] flex items-center justify-between gap-2 px-4 py-2 rounded-full bg-white border border-catl-primary/20 hover:border-catl-accent text-sm shadow-sm transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-catl-primary min-w-0">
          <Users className="w-4 h-4 text-catl-accent shrink-0" />
          <span className="font-semibold truncate">
            {current ? current.name : "Choisir un producteur"}
          </span>
          {current?.isBio && (
            <Leaf
              className="w-3.5 h-3.5 text-catl-success shrink-0"
              aria-label="Bio"
            />
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute inset-x-0 md:inset-x-auto md:right-0 mt-2 w-full md:w-[min(440px,92vw)] bg-white rounded-md shadow-xl border border-catl-primary/10 z-50 flex flex-col overflow-hidden">
          {mode === "list" && (
            <>
              <div className="relative p-2 border-b border-gray-100 bg-catl-bg/60">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-catl-text" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={rawQuery}
                  onChange={(e) => setRawQuery(e.target.value)}
                  placeholder="Rechercher un producteur…"
                  className="w-full pl-9 pr-8 py-2 text-sm rounded-md border border-gray-200 bg-white focus:outline-none focus:border-catl-accent focus:ring-2 focus:ring-catl-accent/20 transition-colors"
                  aria-label="Rechercher un producteur"
                />
                {rawQuery && (
                  <button
                    type="button"
                    aria-label="Effacer la recherche"
                    onClick={() => setRawQuery("")}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-catl-text hover:text-catl-danger"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto">
                {isLoading && (
                  <div className="p-4 text-sm text-catl-text">Chargement…</div>
                )}
                {isError && (
                  <div className="p-4 text-sm text-catl-danger">
                    Impossible de charger les producteurs.
                  </div>
                )}
                {!isLoading && !isError && items.length === 0 && (
                  <div className="p-6 text-center">
                    <p className="text-sm text-catl-text italic">
                      {debouncedQuery
                        ? `Aucun résultat pour « ${debouncedQuery} »`
                        : "Aucun producteur enregistré côté wms-api."}
                    </p>
                  </div>
                )}
                {!isLoading && !isError && items.length > 0 && (
                  <ul role="listbox">
                    {items.map((p) => {
                      const active = p.id === state.currentProducerId;
                      return (
                        <li key={p.id} role="option" aria-selected={active}>
                          <button
                            type="button"
                            onClick={() => {
                              dispatch({
                                type: "setCurrentProducer",
                                producerId: p.id ?? null,
                              });
                              setOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2.5 flex items-start gap-2 transition-colors ${highlightClass(active)}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-semibold text-sm truncate ${active ? "text-catl-accent" : "text-catl-primary"}`}
                                >
                                  {p.name}
                                </span>
                                {p.isBio && (
                                  <Leaf className="w-3 h-3 text-catl-success shrink-0" />
                                )}
                                {active && (
                                  <Check className="w-3.5 h-3.5 text-catl-accent shrink-0" />
                                )}
                              </div>
                              <div className="text-xs text-catl-text truncate">
                                {[p.province, p.address, p.contact]
                                  .filter(Boolean)
                                  .join(" · ") || "—"}
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {!isError && total > 0 && (
                <div className="px-3 py-1.5 border-t border-gray-100 bg-white">
                  <span className="text-xs text-catl-text">
                    {items.length === total
                      ? `${total} producteur${total > 1 ? "s" : ""}`
                      : `${items.length} / ${total} producteurs`}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setMode("create")}
                className="flex items-center gap-2 px-3 py-2.5 border-t border-gray-100 bg-catl-bg/40 hover:bg-catl-accent/10 text-sm font-semibold text-catl-accent transition-colors"
              >
                <Plus className="w-4 h-4" />
                Créer un producteur
              </button>
            </>
          )}

          {mode === "create" && (
            <CreateProducerForm
              onCancel={() => setMode("list")}
              onCreated={(p) => {
                dispatch({
                  type: "setCurrentProducer",
                  producerId: p.id ?? null,
                });
                setMode("list");
                setOpen(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function CreateProducerForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (producer: Producer) => void;
}) {
  const create = useCreateProducer();

  const {
    control,
    register,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<ProducerFormInput, unknown, ProducerFormValues>({
    resolver: zodResolver(producerFormSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      contact: "",
      address: "",
      province: "",
      isBio: false,
    },
  });

  const address = useWatch({ control, name: "address" }) ?? "";
  const isBio = useWatch({ control, name: "isBio" });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const created = await create.mutateAsync({
        name: values.name,
        contact: values.contact || null,
        address: values.address || null,
        province: values.province || null,
        isBio: values.isBio,
      });
      toast.success("Producteur créé.");
      onCreated(created);
    } catch (err) {
      toast.error(
        err instanceof WmsApiError ? err.message : "Création impossible",
      );
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col">
      <div className="px-3 py-2.5 border-b border-gray-100 bg-catl-bg/60 flex items-center justify-between">
        <span className="text-xs font-bold uppercase text-catl-primary tracking-wide">
          Nouveau producteur
        </span>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Retour à la liste"
          className="text-catl-text hover:text-catl-danger"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 space-y-3 max-h-[60vh] overflow-y-auto">
        <Field label="Nom" required error={errors.name?.message}>
          <Input
            invalid={!!errors.name}
            placeholder="Ex : Ferme des Trois Chênes"
            {...register("name")}
          />
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
            leftIcon={<MapPin className="w-4 h-4 text-catl-text/50" />}
          />
        </Field>

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
          className={`flex items-center gap-2.5 px-3 rounded-md border-2 cursor-pointer transition-colors h-[42px] ${
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

      <div className="flex justify-end gap-2 px-3 py-2.5 border-t border-gray-100 bg-white">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={create.isPending}
        >
          Annuler
        </Button>
        <Button type="submit" size="sm" loading={create.isPending}>
          Créer
        </Button>
      </div>
    </form>
  );
}
