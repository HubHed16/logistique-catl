"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChefHat,
  Minus,
  Package,
  Plus,
  Snowflake,
  Thermometer,
  Wheat,
} from "lucide-react";
import { useEffect, useRef, type ComponentType, type SVGProps } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import {
  ApiError,
  useInfrastructure,
  useUpsertInfrastructure,
} from "@/lib/simulator/api-hooks";
import {
  infrastructureFormSchema,
  type InfrastructureFormInput,
  type InfrastructureFormValues,
} from "@/lib/simulator/schemas";

type Props = { producerId: string };

type ZoneKey =
  | "drySurfaceM2"
  | "freshSurfaceM2"
  | "frozenSurfaceM2"
  | "prepSurfaceM2";

type ZoneConfig = {
  key: ZoneKey;
  name: string;
  temp: string;
  hint: string;
  color: string; // HEX pour la barre empilée
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

// Chaque zone porte identité (icône + T°), valeur par défaut et couleur.
// Les couleurs sont alignées sur la palette catl pour rester homogènes.
const ZONES: ZoneConfig[] = [
  {
    key: "drySurfaceM2",
    name: "Stockage sec",
    temp: "Ambiant",
    hint: "Céréales, légumineuses, conserves, huile",
    color: "#e67e22",
    Icon: Wheat,
  },
  {
    key: "freshSurfaceM2",
    name: "Stockage frais",
    temp: "+2 à +8 °C",
    hint: "Produits laitiers, fruits & légumes, charcuterie",
    color: "#3498db",
    Icon: Thermometer,
  },
  {
    key: "frozenSurfaceM2",
    name: "Stockage congelé",
    temp: "≤ −18 °C",
    hint: "Surgelés, glaces, viandes longue conservation",
    color: "#8e44ad",
    Icon: Snowflake,
  },
  {
    key: "prepSurfaceM2",
    name: "Espace préparation",
    temp: "Plan de travail",
    hint: "Tri, conditionnement, étiquetage, picking",
    color: "#27ae60",
    Icon: ChefHat,
  },
];

const MAX_PER_ZONE = 5000;
const STEP = 5;

type Preset = { label: string; values: Record<ZoneKey, number> };
const PRESETS: Preset[] = [
  {
    label: "Maraîcher",
    values: {
      drySurfaceM2: 30,
      freshSurfaceM2: 80,
      frozenSurfaceM2: 10,
      prepSurfaceM2: 40,
    },
  },
  {
    label: "Coopé moyenne",
    values: {
      drySurfaceM2: 200,
      freshSurfaceM2: 150,
      frozenSurfaceM2: 60,
      prepSurfaceM2: 120,
    },
  },
  {
    label: "Plate-forme",
    values: {
      drySurfaceM2: 800,
      freshSurfaceM2: 500,
      frozenSurfaceM2: 250,
      prepSurfaceM2: 400,
    },
  },
];

export function InfrastructureForm({ producerId }: Props) {
  const { data, isLoading } = useInfrastructure(producerId);
  const upsert = useUpsertInfrastructure(producerId);

  const form = useForm<InfrastructureFormInput, unknown, InfrastructureFormValues>({
    resolver: zodResolver(infrastructureFormSchema),
    mode: "onBlur",
    defaultValues: {
      drySurfaceM2: 0,
      freshSurfaceM2: 0,
      frozenSurfaceM2: 0,
      prepSurfaceM2: 0,
    },
  });

  const {
    control,
    setValue,
    handleSubmit,
    formState: { isDirty },
  } = form;

  const dry = Number(useWatch({ control, name: "drySurfaceM2" })) || 0;
  const fresh = Number(useWatch({ control, name: "freshSurfaceM2" })) || 0;
  const frozen = Number(useWatch({ control, name: "frozenSurfaceM2" })) || 0;
  const prep = Number(useWatch({ control, name: "prepSurfaceM2" })) || 0;

  const values: Record<ZoneKey, number> = {
    drySurfaceM2: dry,
    freshSurfaceM2: fresh,
    frozenSurfaceM2: frozen,
    prepSurfaceM2: prep,
  };
  const total = dry + fresh + frozen + prep;

  // Resync quand les data serveur arrivent / changement de producer.
  const lastIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!data) {
      if (lastIdRef.current !== producerId) {
        lastIdRef.current = producerId;
        form.reset({
          drySurfaceM2: 0,
          freshSurfaceM2: 0,
          frozenSurfaceM2: 0,
          prepSurfaceM2: 0,
        });
      }
      return;
    }
    lastIdRef.current = producerId;
    form.reset({
      drySurfaceM2: data.drySurfaceM2,
      freshSurfaceM2: data.freshSurfaceM2,
      frozenSurfaceM2: data.frozenSurfaceM2,
      prepSurfaceM2: data.prepSurfaceM2,
    });
  }, [data, producerId, form]);

  const setZone = (key: ZoneKey, raw: number) => {
    const clamped = Math.max(0, Math.min(MAX_PER_ZONE, Math.round(raw)));
    setValue(key, clamped, { shouldDirty: true });
  };

  const applyPreset = (preset: Preset) => {
    (Object.keys(preset.values) as ZoneKey[]).forEach((k) =>
      setValue(k, preset.values[k], { shouldDirty: true }),
    );
  };

  const onSubmit = handleSubmit(async (v) => {
    try {
      await upsert.mutateAsync(v);
      toast.success("Surfaces mises à jour.");
      form.reset(v);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erreur de sauvegarde");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <section className="catl-section catl-section--success">
        <span className="catl-section-pill">
          <Package className="w-3 h-3" /> Espaces de travail
        </span>

        {isLoading ? (
          <div className="text-sm text-catl-text">Chargement...</div>
        ) : (
          <>
            {/* Total + barre de répartition */}
            <InfrastructureSummary
              total={total}
              values={values}
              onPreset={applyPreset}
            />

            {/* Grille des zones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {ZONES.map((z) => (
                <ZoneCard
                  key={z.key}
                  config={z}
                  value={values[z.key]}
                  total={total}
                  onChange={(v) => setZone(z.key, v)}
                />
              ))}
            </div>

            <div className="flex justify-end mt-5">
              <Button
                type="submit"
                size="md"
                loading={upsert.isPending}
                disabled={!isDirty}
              >
                Enregistrer les surfaces
              </Button>
            </div>
          </>
        )}
      </section>
    </form>
  );
}

function InfrastructureSummary({
  total,
  values,
  onPreset,
}: {
  total: number;
  values: Record<ZoneKey, number>;
  onPreset: (p: Preset) => void;
}) {
  const segments =
    total === 0
      ? []
      : ZONES.map((z) => ({
          key: z.key,
          color: z.color,
          name: z.name,
          value: values[z.key],
          pct: (values[z.key] / total) * 100,
        })).filter((s) => s.value > 0);

  return (
    <div className="rounded-md border border-gray-100 bg-white p-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-catl-text">
            Surface totale
          </div>
          <div className="text-2xl font-extrabold text-catl-primary leading-tight">
            {total.toLocaleString("fr-BE")}{" "}
            <span className="text-base font-bold text-catl-text">m²</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-catl-text mr-1">Préréglages :</span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onPreset(p)}
              className="text-xs font-semibold px-2.5 py-1 rounded-full border border-gray-200 text-catl-primary hover:border-catl-accent hover:bg-catl-accent/5 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 h-3 w-full rounded-full bg-gray-100 overflow-hidden flex">
        {segments.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[10px] text-catl-text italic">
            —
          </div>
        ) : (
          segments.map((s) => (
            <div
              key={s.key}
              className="h-full transition-[flex-grow] duration-200"
              style={{
                flexGrow: s.value,
                background: s.color,
              }}
              title={`${s.name} — ${s.value} m² (${s.pct.toFixed(0)}%)`}
            />
          ))
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {ZONES.map((z) => {
          const v = values[z.key];
          const pct = total > 0 ? (v / total) * 100 : 0;
          return (
            <div
              key={z.key}
              className="flex items-center gap-1.5 text-[11px] text-catl-text"
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm"
                style={{ background: z.color }}
              />
              <span className="font-semibold text-catl-primary">{z.name}</span>
              <span>
                {v} m²
                {total > 0 ? (
                  <span className="text-catl-text"> ({pct.toFixed(0)}%)</span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ZoneCard({
  config,
  value,
  total,
  onChange,
}: {
  config: ZoneConfig;
  value: number;
  total: number;
  onChange: (v: number) => void;
}) {
  const { Icon, color, name, temp, hint } = config;
  const pct = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="rounded-md border-2 border-gray-100 bg-white p-3 hover:border-catl-accent/40 transition-colors">
      <div className="flex items-start gap-3">
        <span
          className="flex items-center justify-center w-9 h-9 rounded-md shrink-0"
          style={{ background: `${color}1a`, color }}
          aria-hidden="true"
        >
          <Icon className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div className="font-bold text-sm text-catl-primary leading-tight">
                {name}
              </div>
              <div
                className="text-[11px] font-semibold"
                style={{ color }}
              >
                {temp}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label={`Diminuer ${name}`}
                onClick={() => onChange(value - STEP)}
                disabled={value <= 0}
                className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-catl-primary hover:border-catl-accent hover:bg-catl-accent/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <label className="sr-only" htmlFor={`zone-${config.key}`}>
                {name} en m²
              </label>
              <input
                id={`zone-${config.key}`}
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_PER_ZONE}
                step={STEP}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-20 text-center font-mono text-sm px-1 py-1 rounded-md border border-gray-200 focus:outline-none focus:border-catl-accent focus:ring-2 focus:ring-catl-accent/20 transition-colors"
              />
              <span className="text-xs font-semibold text-catl-text">m²</span>
              <button
                type="button"
                aria-label={`Augmenter ${name}`}
                onClick={() => onChange(value + STEP)}
                disabled={value >= MAX_PER_ZONE}
                className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-catl-primary hover:border-catl-accent hover:bg-catl-accent/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-[11px] text-catl-text mt-0.5 leading-tight">
            {hint}
          </p>
          {value > 0 && total > 0 && (
            <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-200"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
