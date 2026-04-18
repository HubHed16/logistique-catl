"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { ProductCreateInline } from "@/components/reception/ProductCreateInline";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, SectionTitle } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { ScanInput } from "@/components/ui/ScanInput";
import { WizardStepper } from "@/components/ui/WizardStepper";
import { zoneTypeLabel } from "@/components/ui/ZoneTypeBadge";
import { ApiError } from "@/lib/api";
import { useProductByEan } from "@/lib/hooks/products";
import {
  useAvailableLocations,
  useReception,
} from "@/lib/hooks/reception";
import {
  receptionSchema,
  type ReceptionFormInput,
  type ReceptionFormValues,
} from "@/lib/schemas";
import type { Product, ReceptionResponse } from "@/lib/types";

const STEPS = [
  { label: "Identification", description: "Produit" },
  { label: "Quantité", description: "Poids & T°" },
  { label: "Dates", description: "DLC / DDM / Lot" },
  { label: "Qualité", description: "Contrôle" },
  { label: "Emplacement", description: "Placement stock" },
  { label: "Récap", description: "Validation" },
];

const UNIT_LABEL: Record<string, string> = {
  kg: "kg",
  piece: "pièce",
  liter: "L",
  bunch: "botte",
  dozen: "douzaine",
  box: "caisse",
};

function unitLabel(u: string | null | undefined): string {
  if (!u) return "";
  return UNIT_LABEL[u] ?? u;
}

type StepIndex = 0 | 1 | 2 | 3 | 4 | 5;

export function ReceptionWizard() {
  const [step, setStep] = useState<StepIndex>(0);
  const [scanned, setScanned] = useState<string>("");
  const [identifiedProduct, setIdentifiedProduct] = useState<Product | null>(
    null,
  );
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [result, setResult] = useState<ReceptionResponse | null>(null);

  const form = useForm<ReceptionFormInput, unknown, ReceptionFormValues>({
    resolver: zodResolver(receptionSchema),
    mode: "onBlur",
    defaultValues: {
      productId: "",
      ean: "",
      lotNumber: "",
      quantity: undefined as unknown as number,
      unit: "kg",
      weightDeclared: undefined,
      weightActual: undefined,
      receptionTemp: undefined,
      expirationDate: "",
      bestBefore: "",
      qualityOk: true,
      statusReason: "",
      locationId: "",
    },
  });

  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    trigger,
    formState: { errors },
    reset,
  } = form;

  const qualityOk = useWatch({ control, name: "qualityOk" });

  const receptionMutation = useReception();

  function applyProduct(product: Product) {
    setIdentifiedProduct(product);
    setValue("productId", product.id, { shouldValidate: true });
    setValue("ean", product.ean ?? "", { shouldValidate: false });
    // la colonne unit est VARCHAR côté SQL — on restreint à nos unités connues
    if (["kg", "piece", "liter", "bunch", "dozen", "box"].includes(product.unit)) {
      setValue(
        "unit",
        product.unit as ReceptionFormInput["unit"],
        { shouldValidate: false },
      );
    }

    // Défaut DLC/DDM selon le type de conservation — frais = DLC courte,
    // ambiant/négatif = DDM longue. Reste modifiable par l'utilisateur.
    const today = new Date();
    const daysByType: Record<string, number> = {
      fresh: 7,
      ambient: 180,
      negative: 365,
    };
    const days = daysByType[product.storageType ?? "ambient"] ?? 180;
    const future = new Date(today);
    future.setDate(future.getDate() + days);
    const iso = future.toISOString().slice(0, 10);
    if (product.storageType === "fresh") {
      setValue("expirationDate", iso, { shouldValidate: false });
      setValue("bestBefore", "", { shouldValidate: false });
    } else {
      setValue("bestBefore", iso, { shouldValidate: false });
      setValue("expirationDate", "", { shouldValidate: false });
    }

    // N° de lot par défaut — horodaté, dérivé du code produit / EAN
    const stamp = today.toISOString().slice(0, 10).replace(/-/g, "");
    const suffix = (product.ean ?? product.id).slice(-4).padStart(4, "0");
    setValue("lotNumber", `LOT-${stamp}-${suffix}`, {
      shouldValidate: false,
    });

    setIsCreatingProduct(false);
  }

  async function goNext() {
    const ok = await validateStep(step);
    if (!ok) return;
    // Si KO en étape qualité (3), on saute l'étape emplacement et on va au récap
    if (step === 3 && !getValues("qualityOk")) {
      setStep(5);
      return;
    }
    if (step < 5) setStep((step + 1) as StepIndex);
  }

  function goPrev() {
    if (step === 5 && !getValues("qualityOk")) {
      setStep(3);
      return;
    }
    if (step > 0) setStep((step - 1) as StepIndex);
  }

  async function validateStep(s: StepIndex): Promise<boolean> {
    switch (s) {
      case 0:
        if (!getValues("productId")) {
          toast.error("Identifie un produit avant de continuer.");
          return false;
        }
        return true;
      case 1:
        return trigger(["quantity", "unit", "receptionTemp"]);
      case 2:
        return trigger(["expirationDate", "bestBefore", "lotNumber"]);
      case 3:
        return trigger(["qualityOk", "statusReason"]);
      case 4:
        return trigger(["locationId"]);
      case 5:
        return true;
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const res = await receptionMutation.mutateAsync(values);
      setResult(res);
      toast.success(
        res.status === "blocked"
          ? "Lot rejeté, non stocké."
          : "Réception enregistrée.",
      );
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur inattendue";
      toast.error(msg);
    }
  });

  function resetAll() {
    reset();
    setScanned("");
    setIdentifiedProduct(null);
    setIsCreatingProduct(false);
    setResult(null);
    setStep(0);
  }

  if (result) {
    return <SuccessScreen result={result} onNew={resetAll} />;
  }

  return (
    <div className="space-y-5">
      <Card>
        <WizardStepper steps={STEPS} current={step} />
      </Card>

      <form onSubmit={onSubmit} noValidate>
        {step === 0 && (
          <IdentificationStep
            scanned={scanned}
            setScanned={setScanned}
            identifiedProduct={identifiedProduct}
            applyProduct={applyProduct}
            onClearProduct={() => {
              setIdentifiedProduct(null);
              setValue("productId", "", { shouldValidate: false });
            }}
            isCreatingProduct={isCreatingProduct}
            setIsCreatingProduct={setIsCreatingProduct}
          />
        )}

        {step === 1 && (
          <Card>
            <CardTitle>Quantité, poids et température</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field
                label="Quantité"
                required
                error={errors.quantity?.message}
              >
                <Input
                  type="number"
                  step="0.01"
                  invalid={!!errors.quantity}
                  {...register("quantity")}
                />
              </Field>
              <Field label="Unité" required error={errors.unit?.message}>
                <Select invalid={!!errors.unit} {...register("unit")}>
                  {Object.entries(UNIT_LABEL).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Poids déclaré (kg)"
                hint="Optionnel — bordereau fournisseur"
                error={errors.weightDeclared?.message}
              >
                <Input
                  type="number"
                  step="0.01"
                  invalid={!!errors.weightDeclared}
                  {...register("weightDeclared")}
                />
              </Field>
              <Field
                label="Poids pesé (kg)"
                hint="Optionnel — balance à la réception"
                error={errors.weightActual?.message}
              >
                <Input
                  type="number"
                  step="0.01"
                  invalid={!!errors.weightActual}
                  {...register("weightActual")}
                />
              </Field>
              <Field
                label="Température à la réception (°C)"
                hint={
                  identifiedProduct?.storageType === "ambient"
                    ? "Optionnel pour un produit ambiant."
                    : "Fortement recommandé hors ambiant."
                }
                error={errors.receptionTemp?.message}
              >
                <Input
                  type="number"
                  step="0.1"
                  invalid={!!errors.receptionTemp}
                  {...register("receptionTemp")}
                />
              </Field>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardTitle>Dates & lot fournisseur</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field
                label="DLC (Date Limite de Consommation)"
                hint="Date après laquelle le produit ne peut plus être vendu."
                error={errors.expirationDate?.message}
              >
                <Input
                  type="date"
                  invalid={!!errors.expirationDate}
                  {...register("expirationDate")}
                />
              </Field>
              <Field
                label="DDM (Date de Durabilité Minimale)"
                hint="Don possible après cette date si intégrité OK."
                error={errors.bestBefore?.message}
              >
                <Input
                  type="date"
                  invalid={!!errors.bestBefore}
                  {...register("bestBefore")}
                />
              </Field>
              <Field
                label="N° de lot fournisseur"
                required
                hint="Obligatoire côté SQL (stock_item.lot_number NOT NULL)."
                error={errors.lotNumber?.message}
              >
                <Input
                  type="text"
                  placeholder="LOT-2026-1234"
                  invalid={!!errors.lotNumber}
                  {...register("lotNumber")}
                />
              </Field>
            </div>
          </Card>
        )}

        {step === 3 && <QualityStep form={form} />}

        {step === 4 && (
          <PlacementStep form={form} product={identifiedProduct} />
        )}

        {step === 5 && (
          <RecapStep
            form={form}
            identifiedProduct={identifiedProduct}
            submitting={receptionMutation.isPending}
          />
        )}

        <div className="flex justify-between gap-3 mt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={goPrev}
            disabled={step === 0 || receptionMutation.isPending}
            leftIcon={<ChevronLeft className="w-4 h-4" />}
          >
            Précédent
          </Button>
          {step < 5 ? (
            <Button type="button" onClick={goNext}>
              Suivant
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="lg"
              loading={receptionMutation.isPending}
              variant={qualityOk ? "primary" : "danger"}
            >
              {qualityOk
                ? "Valider la réception"
                : "Enregistrer le rejet"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

// ─── Étape 1 : Identification ──────────────────────────────────────────────

function IdentificationStep({
  scanned,
  setScanned,
  identifiedProduct,
  applyProduct,
  onClearProduct,
  isCreatingProduct,
  setIsCreatingProduct,
}: {
  scanned: string;
  setScanned: (v: string) => void;
  identifiedProduct: Product | null;
  applyProduct: (p: Product) => void;
  onClearProduct: () => void;
  isCreatingProduct: boolean;
  setIsCreatingProduct: (v: boolean) => void;
}) {
  const lookup = useProductByEan(
    scanned && scanned.length >= 8 && !identifiedProduct ? scanned : undefined,
  );

  return (
    <Card validated={!!identifiedProduct}>
      <CardTitle>Identification du produit</CardTitle>

      {!identifiedProduct && !isCreatingProduct && (
        <div className="space-y-4">
          <Field
            label="Code-barres (EAN) ou code lot"
            hint="Scanne le code ou tape-le puis Entrée. EAN 13 chiffres en général."
          >
            <ScanInput
              autoFocus
              value={scanned}
              onChange={(e) => setScanned(e.target.value)}
              onScan={(v) => setScanned(v)}
              placeholder="3760000000000"
            />
          </Field>

          {lookup.isFetching && (
            <p className="text-sm text-catl-text">Recherche du produit...</p>
          )}

          {!lookup.isFetching && scanned && scanned.length >= 8 && (
            <>
              {lookup.data ? (
                <div className="p-4 border-l-4 border-catl-success bg-green-50 rounded-md">
                  <p className="text-sm font-semibold text-catl-primary mb-2">
                    Produit trouvé : {lookup.data.name}
                  </p>
                  <ProductDetails product={lookup.data} />
                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => applyProduct(lookup.data!)}
                    >
                      Utiliser ce produit
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 border-l-4 border-catl-accent bg-orange-50 rounded-md">
                  <p className="text-sm text-catl-primary mb-2">
                    Aucun produit avec ce code. Crée une fiche maintenant.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsCreatingProduct(true)}
                  >
                    Créer une fiche produit
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!identifiedProduct && isCreatingProduct && (
        <ProductCreateInline
          prefillEan={scanned}
          onCancel={() => setIsCreatingProduct(false)}
          onCreated={applyProduct}
        />
      )}

      {identifiedProduct && (
        <div className="p-4 border-l-4 border-catl-success bg-green-50 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-catl-success" />
            <p className="text-sm font-semibold text-catl-primary">
              {identifiedProduct.name}
            </p>
          </div>
          <ProductDetails product={identifiedProduct} />
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onClearProduct();
                setScanned("");
              }}
            >
              Changer de produit
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function ProductDetails({ product }: { product: Product }) {
  return (
    <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
      <div>
        <dt className="uppercase font-semibold text-catl-text">Catégorie</dt>
        <dd className="text-catl-primary">{product.category ?? "—"}</dd>
      </div>
      <div>
        <dt className="uppercase font-semibold text-catl-text">Conservation</dt>
        <dd className="text-catl-primary">
          {product.storageType ? zoneTypeLabel(product.storageType) : "—"}
        </dd>
      </div>
      <div>
        <dt className="uppercase font-semibold text-catl-text">Unité</dt>
        <dd className="text-catl-primary">{unitLabel(product.unit)}</dd>
      </div>
      <div>
        <dt className="uppercase font-semibold text-catl-text">Bio</dt>
        <dd className="text-catl-primary">
          {product.isBio ? "Oui" : "Non"}
          {product.certification ? ` (${product.certification})` : ""}
        </dd>
      </div>
    </dl>
  );
}

// ─── Étape 4 : Qualité ─────────────────────────────────────────────────────

function QualityStep({
  form,
}: {
  form: ReturnType<
    typeof useForm<ReceptionFormInput, unknown, ReceptionFormValues>
  >;
}) {
  const { control, register, setValue, formState } = form;
  const ok = useWatch({ control, name: "qualityOk" });
  return (
    <Card>
      <CardTitle>Contrôle qualité</CardTitle>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button
          type="button"
          onClick={() => setValue("qualityOk", true, { shouldValidate: true })}
          className={`p-5 rounded-md border-2 text-left transition-all ${
            ok
              ? "border-catl-success bg-green-50"
              : "border-gray-200 hover:border-catl-success/50"
          }`}
        >
          <CheckCircle2 className="w-7 h-7 text-catl-success mb-2" />
          <div className="font-bold text-catl-primary">Contrôle OK</div>
          <div className="text-xs text-catl-text">
            Le produit passe le contrôle visuel.
          </div>
        </button>
        <button
          type="button"
          onClick={() => setValue("qualityOk", false, { shouldValidate: true })}
          className={`p-5 rounded-md border-2 text-left transition-all ${
            !ok
              ? "border-catl-danger bg-red-50"
              : "border-gray-200 hover:border-catl-danger/50"
          }`}
        >
          <XCircle className="w-7 h-7 text-catl-danger mb-2" />
          <div className="font-bold text-catl-primary">Contrôle KO</div>
          <div className="text-xs text-catl-text">
            Lot rejeté — pas de stock_item créé.
          </div>
        </button>
      </div>

      <input type="hidden" {...register("qualityOk")} />

      {!ok && (
        <Field
          label="Motif de rejet"
          required
          error={formState.errors.statusReason?.message}
        >
          <Textarea
            placeholder="Ex. Moisissure sur 3 caisses, emballage déchiré…"
            invalid={!!formState.errors.statusReason}
            {...register("statusReason")}
          />
        </Field>
      )}
    </Card>
  );
}

// ─── Étape 5 : Emplacement ────────────────────────────────────────────────

function PlacementStep({
  form,
  product,
}: {
  form: ReturnType<
    typeof useForm<ReceptionFormInput, unknown, ReceptionFormValues>
  >;
  product: Product | null;
}) {
  const { control, register, setValue, formState } = form;
  const locationId = useWatch({ control, name: "locationId" });

  const locationsQuery = useAvailableLocations(
    product?.storageType ?? undefined,
  );

  return (
    <Card>
      <CardTitle>Emplacement de stockage</CardTitle>
      <p className="text-sm text-catl-text mb-4">
        Choisis une location disponible en zone{" "}
        <strong>
          {product?.storageType ? zoneTypeLabel(product.storageType) : "—"}
        </strong>
        .
      </p>

      <input type="hidden" {...register("locationId")} />

      <SectionTitle>Emplacements libres</SectionTitle>
      {locationsQuery.isLoading && (
        <p className="text-sm text-catl-text">
          Recherche d&apos;un emplacement...
        </p>
      )}
      {!locationsQuery.isLoading && locationsQuery.data?.length === 0 && (
        <p className="text-sm text-catl-danger">
          Aucun emplacement disponible pour ce type de conservation. Crée une
          zone / un emplacement adapté avant de valider.
        </p>
      )}
      {(locationsQuery.data ?? []).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
          {(locationsQuery.data ?? []).map((loc) => {
            const selected = locationId === loc.id;
            return (
              <button
                key={loc.id}
                type="button"
                onClick={() =>
                  setValue("locationId", loc.id, { shouldValidate: true })
                }
                className={`p-3 rounded-md border text-left transition-all ${
                  selected
                    ? "border-catl-accent bg-orange-50 ring-2 ring-catl-accent/30"
                    : "border-gray-200 hover:border-catl-accent/40"
                }`}
              >
                <div className="font-semibold text-catl-primary text-sm">
                  {loc.label}
                </div>
                <div className="text-xs text-catl-text font-mono">
                  {loc.rack && <>Rack {loc.rack}</>}
                  {loc.position && <> · Position {loc.position}</>}
                  {loc.temperature !== null && (
                    <> · {loc.temperature.toFixed(1)} °C</>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
      {formState.errors.locationId && (
        <p className="text-xs text-catl-danger mt-2">
          {formState.errors.locationId.message}
        </p>
      )}
    </Card>
  );
}

// ─── Étape 6 : Récap ───────────────────────────────────────────────────────

function RecapStep({
  form,
  identifiedProduct,
  submitting,
}: {
  form: ReturnType<
    typeof useForm<ReceptionFormInput, unknown, ReceptionFormValues>
  >;
  identifiedProduct: Product | null;
  submitting: boolean;
}) {
  const v = useWatch({ control: form.control });
  const ko = !v.qualityOk;

  return (
    <Card>
      <CardTitle>
        {ko ? "Confirmer le rejet" : "Récapitulatif de la réception"}
      </CardTitle>

      {submitting && (
        <p className="text-sm text-catl-text mb-3">Enregistrement...</p>
      )}

      <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <Recap label="Produit">
          {identifiedProduct?.name ?? "—"}
          {identifiedProduct?.storageType && (
            <span className="text-xs text-catl-text ml-2">
              ({zoneTypeLabel(identifiedProduct.storageType)})
            </span>
          )}
        </Recap>
        <Recap label="Quantité">
          {v.quantity ? (
            <>
              <span className="font-mono">{String(v.quantity)}</span>{" "}
              {unitLabel(v.unit)}
            </>
          ) : (
            "—"
          )}
        </Recap>
        <Recap label="Poids (déclaré / pesé)">
          {(v.weightDeclared ?? "—") + " / " + (v.weightActual ?? "—")} kg
        </Recap>
        <Recap label="T° à la réception">
          {v.receptionTemp !== undefined && v.receptionTemp !== ""
            ? `${v.receptionTemp} °C`
            : "—"}
        </Recap>
        <Recap label="DLC">{v.expirationDate || "—"}</Recap>
        <Recap label="DDM">{v.bestBefore || "—"}</Recap>
        <Recap label="Lot fournisseur">{v.lotNumber || "—"}</Recap>
        <Recap label="Qualité">
          {ko ? (
            <span className="text-catl-danger font-semibold">KO</span>
          ) : (
            <span className="text-catl-success font-semibold">OK</span>
          )}
        </Recap>
        {ko && <Recap label="Motif KO">{v.statusReason || "—"}</Recap>}
      </dl>
    </Card>
  );
}

function Recap({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase font-semibold text-catl-text tracking-wide">
        {label}
      </dt>
      <dd className="text-catl-primary">{children}</dd>
    </div>
  );
}

// ─── Écran de succès ───────────────────────────────────────────────────────

function SuccessScreen({
  result,
  onNew,
}: {
  result: ReceptionResponse;
  onNew: () => void;
}) {
  const isBlocked = result.status === "blocked";
  return (
    <Card validated>
      <div className="text-center py-6">
        {isBlocked ? (
          <XCircle className="w-16 h-16 text-catl-danger mx-auto mb-3" />
        ) : (
          <CheckCircle2 className="w-16 h-16 text-catl-success mx-auto mb-3" />
        )}
        <h2 className="text-2xl font-bold text-catl-primary mb-1">
          {isBlocked ? "Lot rejeté" : "Produit mis en stock"}
        </h2>
        <p className="text-catl-text mb-5">
          N° STOCK_ITEM :{" "}
          <span className="font-mono text-catl-primary">
            {result.stockItemId}
          </span>
        </p>

        {result.location && (
          <div className="inline-block px-4 py-2 rounded-md bg-catl-bg text-sm text-catl-primary mb-5">
            Emplacement : <strong>{result.location.label}</strong>
          </div>
        )}

        <div>
          <Button onClick={onNew} size="lg">
            Nouvelle réception
          </Button>
        </div>
      </div>
    </Card>
  );
}
