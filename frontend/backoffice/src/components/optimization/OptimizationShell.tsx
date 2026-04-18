"use client";

import {
  ArrowRight,
  Boxes,
  Building2,
  Info,
  Package,
  Sparkles,
  TrendingDown,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { ApiError, useOptimizeDailyRouting } from "@/lib/simulator/api-hooks";
import type {
  OptimizationHubPickingList,
  OptimizationProducerHubTransfer,
  OptimizationResult,
  OptimizationStopAssignment,
} from "@/lib/simulator/types";

const TODAY = new Date().toISOString().slice(0, 10);

const EUR = new Intl.NumberFormat("fr-BE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

const NUM = new Intl.NumberFormat("fr-BE", { maximumFractionDigits: 2 });

function shortId(id: string): string {
  return id.slice(0, 8);
}

function solverStatusTone(
  status: string,
): "success" | "info" | "accent" | "danger" {
  switch (status) {
    case "OPTIMAL":
      return "success";
    case "FEASIBLE":
      return "info";
    case "NO_STOPS":
    case "NO_PRODUCER_WITH_DEPOT":
    case "NO_HUBS_AVAILABLE":
      return "accent";
    default:
      return "danger";
  }
}

export function OptimizationShell() {
  const [date, setDate] = useState<string>(TODAY);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const optimize = useOptimizeDailyRouting();

  const submit = async () => {
    if (!date) {
      toast.error("Choisis une date avant de lancer l'optimisation.");
      return;
    }
    try {
      const res = await optimize.mutateAsync({
        date,
        handlingFeePerUnit: 0,
        openingFee: 0,
        maxSolveTimeMs: 10000,
      });
      setResult(res);
      toast.success(
        `Optimisation ${res.solverStatus.toLowerCase()} — ${res.stopCount} arrêts.`,
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Optimisation impossible",
      );
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-catl-primary leading-tight flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-catl-accent" />
            Optimisation des tournées
          </h1>
          <p className="text-sm text-catl-text mt-1">
            Répartit les arrêts planifiés du jour entre livraison directe et
            passage par un hub xDock pour minimiser le coût global.
          </p>
        </div>
      </header>

      <section className="catl-section catl-section--primary">
        <span className="catl-section-pill">
          <Sparkles className="w-3 h-3" /> Paramètres
        </span>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[220px]">
            <Field label="Date des tournées" required>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
          </div>
          <Button
            variant="primary"
            loading={optimize.isPending}
            onClick={submit}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            Lancer l&apos;optimisation
          </Button>
        </div>
      </section>

      {!result && !optimize.isPending && (
        <div className="catl-section catl-section--info">
          <span className="catl-section-pill">
            <Info className="w-3 h-3" /> En attente
          </span>
          <p className="text-sm text-catl-text">
            Choisis une date puis lance l&apos;optimisation pour obtenir le plan
            d&apos;orchestration (affectations direct/hub, transferts et
            picking-lists par hub).
          </p>
        </div>
      )}

      {result && <ResultView result={result} />}
    </div>
  );
}

function ResultView({ result }: { result: OptimizationResult }) {
  const tone = solverStatusTone(result.solverStatus);
  const savingsPct =
    result.baselineAllDirectCostEur > 0
      ? (result.savingsEur / result.baselineAllDirectCostEur) * 100
      : 0;

  // On filtre les lignes vides (hubs non retenus, transferts à 0) pour
  // ne montrer que les décisions effectives du solveur.
  const usedHubs = useMemo(
    () => result.pickingLists.filter((h) => h.stopIds.length > 0),
    [result.pickingLists],
  );
  const activeTransfers = useMemo(
    () =>
      result.transfers.filter(
        (t) => t.stopIds.length > 0 || t.totalVolume > 0,
      ),
    [result.transfers],
  );

  return (
    <div className="space-y-5">
      <section className={`catl-section catl-section--${tone}`}>
        <span className="catl-section-pill">
          <TrendingDown className="w-3 h-3" /> Résultat — {result.date}
        </span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-1">
          <Kpi label="Statut solveur" value={result.solverStatus} />
          <Kpi
            label="Temps de résolution"
            value={
              result.solveTimeMs != null ? `${result.solveTimeMs} ms` : "—"
            }
          />
          <Kpi
            label="Arrêts"
            value={String(result.stopCount)}
            icon={<Package className="w-4 h-4" />}
          />
          <Kpi
            label="Producteurs"
            value={String(result.producerCount)}
            icon={<Users className="w-4 h-4" />}
          />
          <Kpi
            label="Hubs disponibles"
            value={String(result.hubsAvailable ?? 0)}
            icon={<Warehouse className="w-4 h-4" />}
          />
          <Kpi
            label="Hubs utilisés"
            value={String(result.hubsUsed ?? 0)}
            icon={<Warehouse className="w-4 h-4" />}
          />
          <Kpi
            label="Coût baseline (tout direct)"
            value={EUR.format(result.baselineAllDirectCostEur)}
          />
          <Kpi
            label="Coût optimisé"
            value={EUR.format(result.optimizedCostEur)}
            emphasis
          />
        </div>
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-catl-success/10 text-catl-success font-bold text-sm">
            <TrendingDown className="w-4 h-4" />
            Économie : {EUR.format(result.savingsEur)}
            {savingsPct > 0 && (
              <span className="text-xs font-semibold opacity-80">
                ({NUM.format(savingsPct)} %)
              </span>
            )}
          </span>
        </div>
      </section>

      {usedHubs.length > 0 && (
        <section className="catl-section catl-section--accent">
          <span className="catl-section-pill">
            <Building2 className="w-3 h-3" /> Hubs retenus ({usedHubs.length})
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
            {usedHubs.map((hub) => (
              <HubCard key={hub.hubId} hub={hub} />
            ))}
          </div>
        </section>
      )}

      {activeTransfers.length > 0 && (
        <section className="catl-section catl-section--info">
          <span className="catl-section-pill">
            <Truck className="w-3 h-3" /> Transferts producteur → hub (
            {activeTransfers.length})
          </span>
          <div className="overflow-x-auto mt-1">
            <TransfersTable transfers={activeTransfers} />
          </div>
        </section>
      )}

      <section className="catl-section catl-section--primary">
        <span className="catl-section-pill">
          <Boxes className="w-3 h-3" /> Affectations des arrêts (
          {result.assignments.length})
        </span>
        <div className="overflow-x-auto mt-1">
          <AssignmentsTable assignments={result.assignments} />
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  emphasis,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="bg-white rounded-md border border-gray-200 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-catl-text/70 font-semibold flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div
        className={`mt-0.5 font-bold ${
          emphasis ? "text-lg text-catl-accent" : "text-sm text-catl-primary"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function HubCard({ hub }: { hub: OptimizationHubPickingList }) {
  return (
    <div className="bg-white rounded-md border border-gray-200 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold text-sm text-catl-primary font-mono">
            Hub {shortId(hub.hubId)}
          </div>
          <div className="text-[11px] text-catl-text/80 font-mono mt-0.5">
            {NUM.format(hub.latitude)}, {NUM.format(hub.longitude)}
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-catl-accent/10 text-catl-accent text-xs font-bold">
          <Package className="w-3 h-3" />
          {NUM.format(hub.totalVolume)} u
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-catl-text/60 font-semibold">
            Arrêts
          </div>
          <div className="font-bold text-catl-primary">
            {hub.stopIds.length}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-catl-text/60 font-semibold">
            Producteurs
          </div>
          <div className="font-bold text-catl-primary">
            {hub.contributingProducers.length}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-catl-text/60 font-semibold">
            Coût d&apos;ouverture
          </div>
          <div className="font-bold text-catl-primary">
            {EUR.format(hub.openingCostEur)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-catl-text/60 font-semibold">
            Hub-producteur
          </div>
          <div className="font-mono text-catl-text">
            {shortId(hub.hubProducerId)}
          </div>
        </div>
      </div>
    </div>
  );
}

function TransfersTable({
  transfers,
}: {
  transfers: OptimizationProducerHubTransfer[];
}) {
  return (
    <table className="w-full text-xs">
      <thead className="text-left text-[10px] uppercase tracking-wide text-catl-text/70">
        <tr className="border-b border-gray-200">
          <Th>Producteur</Th>
          <Th>Hub</Th>
          <Th className="text-right">Arrêts</Th>
          <Th className="text-right">Volume</Th>
          <Th className="text-right">Détour (km)</Th>
          <Th className="text-right">Coût détour</Th>
        </tr>
      </thead>
      <tbody>
        {transfers.map((t, i) => (
          <tr
            key={`${t.producerId}-${t.hubId}-${i}`}
            className="border-b border-gray-100 hover:bg-catl-bg/50"
          >
            <Td className="font-mono">{shortId(t.producerId)}</Td>
            <Td className="font-mono">
              <span className="inline-flex items-center gap-1">
                <ArrowRight className="w-3 h-3 text-catl-text/60" />
                {shortId(t.hubId)}
              </span>
            </Td>
            <Td className="text-right font-semibold">{t.stopIds.length}</Td>
            <Td className="text-right">{NUM.format(t.totalVolume)}</Td>
            <Td className="text-right">{NUM.format(t.detourKm)}</Td>
            <Td className="text-right font-semibold text-catl-primary">
              {EUR.format(t.detourCostEur)}
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AssignmentsTable({
  assignments,
}: {
  assignments: OptimizationStopAssignment[];
}) {
  const sorted = [...assignments].sort((a, b) => {
    if (a.producerId !== b.producerId)
      return a.producerId.localeCompare(b.producerId);
    if (a.routeId !== b.routeId) return a.routeId.localeCompare(b.routeId);
    return a.sequence - b.sequence;
  });
  return (
    <table className="w-full text-xs">
      <thead className="text-left text-[10px] uppercase tracking-wide text-catl-text/70">
        <tr className="border-b border-gray-200">
          <Th>Producteur</Th>
          <Th>Trajet</Th>
          <Th className="text-right">#</Th>
          <Th>Mode</Th>
          <Th>Hub</Th>
          <Th className="text-right">Volume</Th>
          <Th className="text-right">Coût direct</Th>
          <Th className="text-right">Coût via hub</Th>
          <Th className="text-right">Gain</Th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((a) => {
          const gain =
            a.viaHubCostEur != null ? a.directCostEur - a.viaHubCostEur : null;
          return (
            <tr
              key={a.stopId}
              className="border-b border-gray-100 hover:bg-catl-bg/50"
            >
              <Td className="font-mono">{shortId(a.producerId)}</Td>
              <Td className="font-mono">{shortId(a.routeId)}</Td>
              <Td className="text-right">{a.sequence}</Td>
              <Td>
                <span
                  className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                    a.mode === "VIA_HUB"
                      ? "bg-catl-accent/10 text-catl-accent"
                      : "bg-catl-info/10 text-catl-info"
                  }`}
                >
                  {a.mode === "VIA_HUB" ? "Via hub" : "Direct"}
                </span>
              </Td>
              <Td className="font-mono">
                {a.hubId ? shortId(a.hubId) : "—"}
              </Td>
              <Td className="text-right">{NUM.format(a.volume)}</Td>
              <Td className="text-right">{EUR.format(a.directCostEur)}</Td>
              <Td className="text-right">
                {a.viaHubCostEur != null ? EUR.format(a.viaHubCostEur) : "—"}
              </Td>
              <Td
                className={`text-right font-semibold ${
                  gain != null && gain > 0
                    ? "text-catl-success"
                    : "text-catl-text"
                }`}
              >
                {gain != null && gain > 0 ? EUR.format(gain) : "—"}
              </Td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`py-2 px-2 font-semibold ${className ?? ""}`}>{children}</th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`py-1.5 px-2 ${className ?? ""}`}>{children}</td>;
}
