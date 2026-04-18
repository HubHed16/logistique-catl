"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Info, MapPin, Settings2, Truck, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProducerSelector } from "@/components/simulator/ProducerSelector";
import { RouteEditor } from "@/components/simulator/RouteEditor";
import { RoutesSection } from "@/components/simulator/RoutesSection";
import {
  useInfrastructure,
  useProducer,
  useProducerCoords,
  useVehicles,
} from "@/lib/simulator/api-hooks";
import { useSimulator } from "@/lib/simulator/state";

const SimulatorMap = dynamic(
  () =>
    import("@/components/simulator/SimulatorMap").then((m) => m.SimulatorMap),
  { ssr: false },
);

export function SimulatorShell() {
  const { state } = useSimulator();
  const { data: producer } = useProducer(state.currentProducerId);
  const { data: infrastructure } = useInfrastructure(state.currentProducerId);
  const { data: vehiclesPage } = useVehicles(state.currentProducerId);
  const currentId = state.currentProducerId;

  const coords = useProducerCoords(producer?.address);
  const hasInfra = !!infrastructure;
  const vehicleCount = vehiclesPage?.items?.length ?? 0;

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
            Choisis un producteur dans le menu en haut à droite, ou{" "}
            <Link
              href="/producers"
              className="underline text-catl-accent font-semibold"
            >
              crée-en un depuis l&apos;onglet Producteurs
            </Link>
            .
          </p>
        </div>
      )}

      {currentId && producer && (
        <>
          <div className="catl-section catl-section--primary">
            <span className="catl-section-pill">
              <Users className="w-3 h-3" /> Producteur actif
            </span>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="font-bold text-lg text-catl-primary">
                  {producer.name}
                </div>
                <div className="text-xs text-catl-text flex flex-wrap gap-x-3 gap-y-1 mt-1">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {coords ? (
                      <span className="font-mono">
                        {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
                      </span>
                    ) : producer.address ? (
                      <span className="text-catl-text italic">
                        Géocodage de l&apos;adresse…
                      </span>
                    ) : (
                      <span className="text-catl-danger">
                        Adresse non renseignée
                      </span>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Settings2 className="w-3 h-3" />
                    {hasInfra ? (
                      `Surfaces ${infrastructure.drySurfaceM2}/${infrastructure.freshSurfaceM2}/${infrastructure.frozenSurfaceM2}/${infrastructure.prepSurfaceM2} m²`
                    ) : (
                      <span className="text-catl-danger">
                        Infrastructure non configurée
                      </span>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    {vehicleCount > 0 ? (
                      `${vehicleCount} véhicule${vehicleCount > 1 ? "s" : ""}`
                    ) : (
                      <span className="text-catl-danger">
                        Aucun véhicule
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <Link href="/producers">
                <Button variant="secondary" size="sm">
                  Gérer ce producteur
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 items-start">
            <div className="xl:col-span-3">
              {state.activeRouteId ? (
                <RouteEditor producerId={currentId} />
              ) : (
                <RoutesSection producerId={currentId} />
              )}
            </div>
            <div className="xl:col-span-2 xl:sticky xl:top-5">
              <SimulatorMap />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
