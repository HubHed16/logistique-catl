"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DepotForm } from "@/components/simulator/DepotForm";
import {
  depotSchema,
  type DepotFormInput,
  type DepotFormValues,
} from "@/lib/simulator/schemas";
import { useSimulator } from "@/lib/simulator/state";
import type { Depot } from "@/lib/simulator/types";

function toFormValues(d: Depot): DepotFormInput {
  return {
    name: d.pData.name,
    mail: d.mail,
    addr: d.pData.addr,
    lat: d.pData.lat as unknown as number,
    lon: d.pData.lon as unknown as number,
    jobs: d.job,
    vehType: d.veh.type,
    fuel: d.veh.fuel,
    vehCons: d.veh.cons,
    fuelPrice: d.veh.price,
    vehAmort: d.veh.amort,
    vehFrigo: d.veh.frigo,
    driver: d.veh.driver,
    cH: d.veh.cH,
    tPrep: d.veh.tPrep,
    tLoad: d.veh.tLoad,
    infraSec: d.infra.sec,
    infraFrais: d.infra.frais,
    infraNeg: d.infra.neg,
    infraPrep: d.infra.prep,
  };
}

function fromFormValues(v: DepotFormValues): Depot {
  return {
    pData: { lat: v.lat, lon: v.lon, addr: v.addr, name: v.name },
    mail: v.mail ?? "",
    job: v.jobs,
    infra: {
      sec: v.infraSec,
      frais: v.infraFrais,
      neg: v.infraNeg,
      prep: v.infraPrep,
    },
    veh: {
      type: v.vehType,
      fuel: v.fuel,
      cons: v.vehCons,
      price: v.fuelPrice,
      amort: v.vehAmort,
      frigo: v.vehFrigo,
      driver: v.driver,
      cH: v.cH,
      tPrep: v.tPrep,
      tLoad: v.tLoad,
    },
  };
}

// Leaflet touche `window` → import dynamique uniquement côté client
const SimulatorMap = dynamic(
  () =>
    import("@/components/simulator/SimulatorMap").then((m) => m.SimulatorMap),
  { ssr: false },
);

export function SimulatorShell() {
  const { state, dispatch } = useSimulator();
  const [pickMode, setPickMode] = useState(false);

  const methods = useForm<DepotFormInput, unknown, DepotFormValues>({
    resolver: zodResolver(depotSchema),
    mode: "onChange",
    defaultValues: toFormValues(state.depot),
  });

  // Ré-initialise le form une seule fois quand le state hydrate depuis
  // le localStorage (le provider dispatch `loadFromStorage` au mount).
  const initDoneRef = useRef(false);
  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;
    methods.reset(toFormValues(state.depot));
  }, [state.depot, methods]);

  const onValidate = methods.handleSubmit((values) => {
    dispatch({ type: "updateDepot", depot: fromFormValues(values) });
    dispatch({ type: "lockDepot" });
  });

  const onResetAll = useCallback(() => {
    if (!confirm("Réinitialiser l'ensemble du projet (dépôt + tournées) ?"))
      return;
    dispatch({ type: "resetAll" });
    methods.reset(toFormValues({ ...state.depot }));
    setPickMode(false);
  }, [dispatch, methods, state.depot]);

  const locked = state.depotLocked;

  return (
    <FormProvider {...methods}>
      <div className="space-y-5">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-catl-primary">
              Simulateur logistique
            </h1>
            <p className="text-sm text-catl-text mt-1">
              Planifier ses tournées en circuit court — coûts, temps, ratio
              logistique, dépôt géolocalisé.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={onResetAll}
          >
            Réinitialiser tout
          </Button>
        </header>

        <form onSubmit={onValidate} noValidate className="space-y-5">
          {locked ? (
            // Post-lock : résumé compact sticky + carte pleine largeur
            <>
              <div className="sticky top-0 z-20 -mx-6 px-6 py-3 bg-catl-bg/90 backdrop-blur-sm border-b border-gray-200 transition-all">
                <DepotForm
                  onRequestMapPick={() => setPickMode((m) => !m)}
                  mapPickMode={pickMode}
                />
              </div>
              <SimulatorMap
                pickMode={pickMode}
                onPicked={() => setPickMode(false)}
              />
              <div className="catl-card">
                <h2 className="text-lg font-bold text-catl-primary mb-2">
                  📅 Édition des tournées
                </h2>
                <p className="text-sm text-catl-text">
                  L&apos;ajout d&apos;arrêts et le calcul des KPIs arrivent en
                  Phase 2. Le dépôt est verrouillé et prêt à recevoir des
                  tournées.
                </p>
              </div>
            </>
          ) : (
            // Avant lock : formulaire gauche + carte droite
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
              <div className="lg:col-span-3">
                <DepotForm
                  onRequestMapPick={() => setPickMode((m) => !m)}
                  mapPickMode={pickMode}
                />
              </div>
              <div className="lg:col-span-2 lg:sticky lg:top-5">
                <SimulatorMap
                  pickMode={pickMode}
                  onPicked={() => setPickMode(false)}
                />
              </div>
            </div>
          )}
        </form>
      </div>
    </FormProvider>
  );
}
