"use client";

import dynamic from "next/dynamic";
import { Info } from "lucide-react";
import { InfrastructureForm } from "@/components/simulator/InfrastructureForm";
import { ProducerForm } from "@/components/simulator/ProducerForm";
import { ProducerSelector } from "@/components/simulator/ProducerSelector";
import { VehicleForm } from "@/components/simulator/VehicleForm";
import { useProducer } from "@/lib/simulator/api-hooks";
import { useSimulator } from "@/lib/simulator/state";

const SimulatorMap = dynamic(
  () =>
    import("@/components/simulator/SimulatorMap").then((m) => m.SimulatorMap),
  { ssr: false },
);

export function SimulatorShell() {
  const { state } = useSimulator();
  const { data: producer, isLoading } = useProducer(state.currentProducerId);
  const currentId = state.currentProducerId;

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-catl-primary leading-tight">
            Simulateur logistique
          </h1>
          <p className="text-sm text-catl-text mt-1">
            Planifier ses tournées en circuit court — coûts, temps, ratio
            logistique.
          </p>
        </div>
        <ProducerSelector />
      </header>

      {!currentId && (
        <div className="catl-section catl-section--info">
          <span className="catl-section-pill">
            <Info className="w-3 h-3" /> Aucun producteur sélectionné
          </span>
          <p className="text-sm text-catl-text">
            Sélectionne un producteur dans le menu en haut à droite, ou
            crée-en un pour commencer à configurer dépôt, surfaces et
            véhicule.
          </p>
        </div>
      )}

      {currentId && isLoading && (
        <div className="text-sm text-catl-text">Chargement du producteur…</div>
      )}

      {currentId && producer && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-start">
          <div className="xl:col-span-3 space-y-5">
            <ProducerForm producer={producer} />
            <InfrastructureForm producerId={producer.id} />
            <VehicleForm producerId={producer.id} />
          </div>
          <div className="xl:col-span-2 xl:sticky xl:top-5">
            <SimulatorMap />
          </div>
        </div>
      )}
    </div>
  );
}
