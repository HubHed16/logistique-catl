"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Thermometer } from "lucide-react";
import { useEffect, useRef } from "react";
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

  const { control, setValue, handleSubmit, formState: { isDirty } } = form;

  const dry = Number(useWatch({ control, name: "drySurfaceM2" })) || 0;
  const fresh = Number(useWatch({ control, name: "freshSurfaceM2" })) || 0;
  const frozen = Number(useWatch({ control, name: "frozenSurfaceM2" })) || 0;
  const prep = Number(useWatch({ control, name: "prepSurfaceM2" })) || 0;

  // Resync le form quand les données serveur arrivent / changent de producer.
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

  const onSubmit = handleSubmit(async (values) => {
    try {
      await upsert.mutateAsync(values);
      toast.success("Surfaces mises à jour.");
      form.reset(values);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erreur de sauvegarde");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <section className="catl-section catl-section--success">
        <span className="catl-section-pill">
          <Thermometer className="w-3 h-3" /> Espaces de travail (m²)
        </span>

        {isLoading ? (
          <div className="text-sm text-catl-text">Chargement...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SurfaceSlider
                label="Stockage sec"
                value={dry}
                onChange={(v) =>
                  setValue("drySurfaceM2", v, { shouldDirty: true })
                }
                color="#e67e22"
              />
              <SurfaceSlider
                label="Stockage frais"
                value={fresh}
                onChange={(v) =>
                  setValue("freshSurfaceM2", v, { shouldDirty: true })
                }
                color="#3498db"
              />
              <SurfaceSlider
                label="Stockage congelé (T° < 0)"
                value={frozen}
                onChange={(v) =>
                  setValue("frozenSurfaceM2", v, { shouldDirty: true })
                }
                color="#8e44ad"
              />
              <SurfaceSlider
                label="Espace préparation"
                value={prep}
                onChange={(v) =>
                  setValue("prepSurfaceM2", v, { shouldDirty: true })
                }
                color="#27ae60"
              />
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

function SurfaceSlider({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  const pct = Math.min(100, (value / 200) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-catl-primary">{label}</span>
        <span
          className="font-mono text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${color}22`, color }}
        >
          {value} m²
        </span>
      </div>
      <input
        type="range"
        className="catl-range"
        min={0}
        max={200}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        style={
          {
            ["--range-progress" as string]: `${pct}%`,
            ["--range-color" as string]: color,
          } as React.CSSProperties
        }
      />
    </div>
  );
}
