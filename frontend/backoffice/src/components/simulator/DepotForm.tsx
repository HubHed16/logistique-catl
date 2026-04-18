"use client";

import {
  Check,
  Edit3,
  Factory,
  MapPin,
  Mail,
  Snowflake,
  Target,
  Tags,
  Thermometer,
  Truck,
  User,
} from "lucide-react";
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
  const vehFrigo = useWatch({ control, name: "vehFrigo" });
  const infraSec = Number(useWatch({ control, name: "infraSec" })) || 0;
  const infraFrais = Number(useWatch({ control, name: "infraFrais" })) || 0;
  const infraNeg = Number(useWatch({ control, name: "infraNeg" })) || 0;
  const infraPrep = Number(useWatch({ control, name: "infraPrep" })) || 0;

  if (locked) {
    const v = getValues();
    return (
      <section className="catl-section catl-section--success">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="text-sm text-catl-primary space-y-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="catl-section-pill">
                <Check className="w-3 h-3" /> Dépôt verrouillé
              </span>
            </div>
            <div className="font-bold text-lg">{v.name}</div>
            {v.jobs && v.jobs.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {v.jobs.slice(0, 6).map((j) => (
                  <span
                    key={j}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-catl-bg text-catl-text"
                  >
                    {j}
                  </span>
                ))}
                {v.jobs.length > 6 && (
                  <span className="text-[11px] text-catl-text">
                    +{v.jobs.length - 6}
                  </span>
                )}
              </div>
            )}
            <div className="text-xs text-catl-text flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{v.addr}</span>
              <span className="font-mono ml-2 text-catl-locked">
                {Number(v.lat).toFixed(5)}, {Number(v.lon).toFixed(5)}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] text-catl-text pt-1">
              <span className="inline-flex items-center gap-1">
                <Truck className="w-3 h-3" /> {v.vehType}
                {v.vehFrigo && <Snowflake className="w-3 h-3 text-catl-info" />}
              </span>
              <span>
                ⛽ {v.fuel} · {String(v.vehCons)} L/100 · {String(v.fuelPrice)}{" "}
                €/L · Amort. {String(v.vehAmort)} €/km
              </span>
              <span className="inline-flex items-center gap-1">
                <User className="w-3 h-3" /> {v.driver} · {String(v.cH)} €/h
              </span>
              <span>
                Surfaces — Sec {String(v.infraSec)} / Frais{" "}
                {String(v.infraFrais)} / Nég {String(v.infraNeg)} / Prépa{" "}
                {String(v.infraPrep)} m²
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
            onClick={() => dispatch({ type: "unlockDepot" })}
          >
            Modifier
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {/* Identité */}
      <section className="catl-section catl-section--primary">
        <span className="catl-section-pill">
          <Factory className="w-3 h-3" /> Identité de la ferme
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            label="Email de contact"
            hint="Optionnel"
            error={errors.mail?.message}
          >
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-catl-text/50 pointer-events-none" />
              <Input
                type="email"
                className="pl-9"
                placeholder="contact@ferme.com"
                invalid={!!errors.mail}
                {...register("mail")}
              />
            </div>
          </Field>

          <div className="md:col-span-2">
            <Field
              label="Adresse du dépôt"
              required
              error={
                errors.addr?.message ??
                errors.lat?.message ??
                errors.lon?.message
              }
              hint={
                lat != null && lon != null && !errors.lat && !errors.lon
                  ? `📍 ${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}`
                  : "Tape une adresse puis clique « Placer » pour la poser sur la carte."
              }
            >
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-catl-text/50 pointer-events-none" />
                  <Input
                    type="text"
                    className="pl-9"
                    placeholder="Rue des Guillemins, Liège"
                    invalid={!!errors.addr}
                    value={addr ?? ""}
                    onChange={(e) =>
                      setValue("addr", e.target.value, {
                        shouldValidate: true,
                      })
                    }
                  />
                </div>
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

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-catl-text mb-2 uppercase tracking-wide">
              <Tags className="inline w-3 h-3 mr-1" />
              Métiers (plusieurs possibles){" "}
              <span className="text-catl-danger">*</span>
              {jobs.length > 0 && (
                <span className="ml-2 text-catl-accent font-bold normal-case">
                  {jobs.length} sélectionné{jobs.length > 1 ? "s" : ""}
                </span>
              )}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRODUCTION_TYPES.map((t) => {
                const checked = jobs.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    className={`catl-chip ${checked ? "catl-chip--active" : ""}`}
                    aria-pressed={checked}
                    onClick={() => {
                      const next = checked
                        ? jobs.filter((x) => x !== t)
                        : [...jobs, t];
                      setValue("jobs", next, { shouldValidate: true });
                    }}
                  >
                    {checked && <Check className="w-3 h-3" />}
                    {t}
                  </button>
                );
              })}
            </div>
            {errors.jobs && (
              <p className="text-xs text-catl-danger mt-1.5">
                {errors.jobs.message}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Transport */}
      <section className="catl-section catl-section--info">
        <span className="catl-section-pill">
          <Truck className="w-3 h-3" /> Paramètres transport
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <label
            className={`flex items-center gap-2.5 px-3 rounded-md border-2 cursor-pointer transition-colors self-end h-[42px] whitespace-nowrap ${
              vehFrigo
                ? "border-catl-info bg-catl-info/5"
                : "border-gray-200 hover:border-catl-info/40"
            }`}
          >
            <input
              type="checkbox"
              className="w-4 h-4 accent-catl-info"
              {...register("vehFrigo")}
            />
            <Snowflake className="w-4 h-4 text-catl-info shrink-0" />
            <span className="text-sm font-semibold text-catl-primary">
              Réfrigéré
            </span>
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
      </section>

      {/* Organisation logistique */}
      <section className="catl-section catl-section--accent">
        <span className="catl-section-pill">
          <User className="w-3 h-3" /> Organisation logistique
        </span>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      </section>

      {/* Surfaces */}
      <section className="catl-section catl-section--success">
        <span className="catl-section-pill">
          <Thermometer className="w-3 h-3" /> Espaces de travail (m²)
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SurfaceSlider
            label="Stockage Sec"
            value={infraSec}
            onChange={(v) =>
              setValue("infraSec", v, { shouldValidate: true })
            }
            color="#e67e22"
          />
          <SurfaceSlider
            label="Stockage Frais"
            value={infraFrais}
            onChange={(v) =>
              setValue("infraFrais", v, { shouldValidate: true })
            }
            color="#3498db"
          />
          <SurfaceSlider
            label="Stock. Négatif (T°<0)"
            value={infraNeg}
            onChange={(v) =>
              setValue("infraNeg", v, { shouldValidate: true })
            }
            color="#8e44ad"
          />
          <SurfaceSlider
            label="Espace Prépa."
            value={infraPrep}
            onChange={(v) =>
              setValue("infraPrep", v, { shouldValidate: true })
            }
            color="#27ae60"
          />
        </div>
      </section>

      <div className="flex justify-end items-center gap-3 pt-2">
        {!isValid && (
          <span className="text-xs text-catl-text italic">
            Complète les champs requis pour verrouiller le dépôt.
          </span>
        )}
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
