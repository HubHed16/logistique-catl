"use client";

import { Info, Users } from "lucide-react";
import { InfrastructureForm } from "@/components/simulator/InfrastructureForm";
import { ProducerForm } from "@/components/simulator/ProducerForm";
import { ProducerSelector } from "@/components/simulator/ProducerSelector";
import { VehiclesSection } from "@/components/simulator/VehiclesSection";
import { useProducer } from "@/lib/simulator/api-hooks";
import { useSimulator } from "@/lib/simulator/state";

export function ProducersShell() {
  const { state } = useSimulator();
  const { data: producer, isLoading } = useProducer(state.currentProducerId);
  const currentId = state.currentProducerId;

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-catl-primary leading-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-catl-accent" />
            Producteurs
          </h1>
          <p className="text-sm text-catl-text mt-1">
            Gérer les fiches producteurs, leurs surfaces de stockage et leurs
            véhicules.
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
            crée-en un pour commencer à saisir ses informations.
          </p>
        </div>
      )}

      {currentId && isLoading && (
        <div className="text-sm text-catl-text">Chargement du producteur…</div>
      )}

      {currentId && producer && (
        <div className="space-y-5">
          <ProducerForm producer={producer} />
          <InfrastructureForm producerId={producer.id} />
          <VehiclesSection producerId={producer.id} />
        </div>
      )}
    </div>
  );
}
