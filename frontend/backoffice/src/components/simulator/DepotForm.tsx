"use client";

import { Check, Edit3, Target } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import {
  DRIVER_TYPES,
  FUEL_TYPES,
  PRODUCTION_TYPES,
  VEHICLE_TYPES,
} from "@/lib/simulator/constants";
import type { DepotFormInput } from "@/lib/simulator/schemas";
import { useSimulator } from "@/lib/simulator/state";

type Props = {
  onRequestMapPick: () => void;
  mapPickMode: boolean;
};

export function DepotForm({ onRequestMapPick, mapPickMode }: Props) {
  const { state, dispatch } = useSimulator();
  const locked = state.depotLocked;

  const {
    control,
    register,
    formState: { errors, isValid },
    setValue,
    getValues,
  } = useFormContext<DepotFormInput>();

  const jobs = useWatch({ control, name: "jobs" }) ?? [];
  const lat = useWatch({ control, name: "lat" });
  const lon = useWatch({ control, name: "lon" });
  const addr = useWatch({ control, name: "addr" });

  // Affichage chips pour la surface
  const infraSec = useWatch({ control, name: "infraSec" }) ?? 0;
  const infraFrais = useWatch({ control, name: "infraFrais" }) ?? 0;
  const infraNeg = useWatch({ control, name: "infraNeg" }) ?? 0;
  const infraPrep = useWatch({ control, name: "infraPrep" }) ?? 0;

  if (locked) {
    const v = getValues();
    return (
      <div className="catl-card catl-card--validated">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="text-sm text-catl-primary space-y-1">
            <div className="font-bold text-base">
              {v.name}{" "}
              {v.jobs && v.jobs.length > 0 && (
                <span className="text-xs font-normal text-catl-text">
                  · {v.jobs.join(", ")}
                </span>
              )}
            </div>
            <div className="text-xs text-catl-text">{v.addr}</div>
            <div className="text-xs text-catl-text font-mono">
              {v.lat?.toFixed?.(5)} / {v.lon?.toFixed?.(5)}
            </div>
            <div className="text-xs text-catl-text">
              {v.vehType} · {v.fuel}
              {v.vehFrigo ? " · ❄️ Frigo" : ""} · {String(v.vehCons)}{" "}
              L/100km · {String(v.fuelPrice)} €/L · Amort. {String(v.vehAmort)}{" "}
              €/km
            </div>
            <div className="text-xs text-catl-text">
              {v.driver} · {String(v.cH)} €/h · Prép {String(v.tPrep)} min ·
              Chargt {String(v.tLoad)} min
            </div>
            <div className="text-xs text-catl-text">
              Sec {String(v.infraSec)} m² · Frais {String(v.infraFrais)} m² ·
              Négatif {String(v.infraNeg)} m² · Prépa {String(v.infraPrep)} m²
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
            onClick={() => dispatch({ type: "unlockDepot" })}
          >
            Modifier
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="catl-card">
      <h2 className="text-lg font-bold text-catl-primary mb-4">
        Configuration du dépôt
      </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <Field
            label="Nom de la ferme / point de départ"
            required
            error={errors.name?.message}
          >
            <Input
              type="text"
              placeholder="Ex : Ferme du Soleil"
              invalid={!!errors.name}
              {...register("name")}
            />
          </Field>

          <Field
            label="Métiers (plusieurs possibles)"
            required
            hint={jobs.length ? `${jobs.length} sélectionné(s)` : undefined}
            error={errors.jobs?.message}
          >
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2 grid grid-cols-1 sm:grid-cols-2 gap-1 bg-white text-xs">
              {PRODUCTION_TYPES.map((t) => {
                const checked = jobs.includes(t);
                return (
                  <label
                    key={t}
                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-catl-bg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="accent-catl-success"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...jobs, t]
                          : jobs.filter((x) => x !== t);
                        setValue("jobs", next, { shouldValidate: true });
                      }}
                    />
                    {t}
                  </label>
                );
              })}
            </div>
          </Field>

          <Field
            label="Email de contact"
            hint="Optionnel"
            error={errors.mail?.message}
          >
            <Input
              type="email"
              placeholder="contact@ferme.com"
              invalid={!!errors.mail}
              {...register("mail")}
            />
          </Field>

          <Field
            label="Adresse du dépôt"
            required
            error={errors.addr?.message ?? errors.lat?.message ?? errors.lon?.message}
            hint={
              lat != null && lon != null && !errors.lat && !errors.lon
                ? `${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}`
                : "Tape une adresse puis clique 🎯 pour la poser sur la carte"
            }
          >
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Rue des Guillemins, Liège"
                invalid={!!errors.addr}
                value={addr ?? ""}
                onChange={(e) =>
                  setValue("addr", e.target.value, { shouldValidate: true })
                }
              />
              <Button
                type="button"
                size="sm"
                variant={mapPickMode ? "primary" : "secondary"}
                onClick={onRequestMapPick}
                leftIcon={<Target className="w-3.5 h-3.5" />}
                aria-label="Placer sur la carte"
              >
                {mapPickMode ? "Clique sur la carte" : "Placer"}
              </Button>
            </div>
          </Field>
        </div>

        <fieldset className="border border-gray-200 rounded-md p-4 mb-5">
          <legend className="catl-section-title px-2">
            🚚 Paramètres Transport
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Type de véhicule" required>
              <Select {...register("vehType")}>
                {VEHICLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Énergie" required>
              <Select {...register("fuel")}>
                {FUEL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <label className="flex items-end gap-2 pb-2 text-sm text-catl-text font-semibold">
              <input
                type="checkbox"
                className="w-4 h-4 accent-catl-info"
                {...register("vehFrigo")}
              />
              ❄️ Véhicule réfrigéré
            </label>
            <Field
              label="Conso (L ou kWh / 100 km)"
              error={errors.vehCons?.message}
            >
              <Input
                type="number"
                step="0.1"
                invalid={!!errors.vehCons}
                {...register("vehCons")}
              />
            </Field>
            <Field label="Prix (€/L ou €/kWh)" error={errors.fuelPrice?.message}>
              <Input
                type="number"
                step="0.01"
                invalid={!!errors.fuelPrice}
                {...register("fuelPrice")}
              />
            </Field>
            <Field
              label="Amort. / entretien (€/km)"
              error={errors.vehAmort?.message}
            >
              <Input
                type="number"
                step="0.01"
                invalid={!!errors.vehAmort}
                {...register("vehAmort")}
              />
            </Field>
          </div>
        </fieldset>

        <fieldset className="border border-gray-200 rounded-md p-4 mb-5">
          <legend className="catl-section-title px-2">
            👤 Organisation Logistique
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Field label="Qui livre ?" required>
              <Select {...register("driver")}>
                {DRIVER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Coût personnel (€/h)" error={errors.cH?.message}>
              <Input
                type="number"
                step="0.5"
                invalid={!!errors.cH}
                {...register("cH")}
              />
            </Field>
            <Field label="Prépa. (min)" error={errors.tPrep?.message}>
              <Input
                type="number"
                step="1"
                invalid={!!errors.tPrep}
                {...register("tPrep")}
              />
            </Field>
            <Field label="Chargement (min)" error={errors.tLoad?.message}>
              <Input
                type="number"
                step="1"
                invalid={!!errors.tLoad}
                {...register("tLoad")}
              />
            </Field>
          </div>
        </fieldset>

        <fieldset className="border border-gray-200 rounded-md p-4 mb-5">
          <legend className="catl-section-title px-2">
            🏭 Espaces de travail (m²)
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SurfaceSlider
              label="Stockage Sec"
              field="infraSec"
              value={Number(infraSec) || 0}
              onChange={(v) =>
                setValue("infraSec", v, { shouldValidate: true })
              }
            />
            <SurfaceSlider
              label="Stockage Frais"
              field="infraFrais"
              value={Number(infraFrais) || 0}
              onChange={(v) =>
                setValue("infraFrais", v, { shouldValidate: true })
              }
            />
            <SurfaceSlider
              label="Stock. Négatif (T°<0)"
              field="infraNeg"
              value={Number(infraNeg) || 0}
              onChange={(v) =>
                setValue("infraNeg", v, { shouldValidate: true })
              }
            />
            <SurfaceSlider
              label="Espace Prépa."
              field="infraPrep"
              value={Number(infraPrep) || 0}
              onChange={(v) =>
                setValue("infraPrep", v, { shouldValidate: true })
              }
            />
          </div>
        </fieldset>

      <div className="flex justify-center">
        <Button
          type="submit"
          size="lg"
          disabled={!isValid}
          leftIcon={<Check className="w-4 h-4" />}
        >
          Valider le dépôt & passer aux arrêts
        </Button>
      </div>
    </div>
  );
}

function SurfaceSlider({
  label,
  field,
  value,
  onChange,
}: {
  label: string;
  field: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-md p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-catl-text">{label}</span>
        <span className="font-mono text-sm font-bold text-catl-info">
          {value} m²
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={200}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-catl-info"
        aria-label={label}
        id={`surface-${field}`}
      />
    </div>
  );
}
