"use client";

import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Coins,
  Copy,
  Fuel,
  Lock,
  Pencil,
  Receipt,
  Sparkles,
  Trash2,
  Truck,
  Users,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RouteForm } from "@/components/simulator/RouteForm";
import { RouteStatusBadge } from "@/components/simulator/RouteStatusBadge";
import { StopsList } from "@/components/simulator/StopsList";
import {
  ApiError,
  useComputeRoute,
  useDeleteRoute,
  useDuplicateRoute,
  useOptimizeRoute,
  useProducer,
  useProducerCoords,
  useRoute,
  useRouteLockStatus,
  useValidateRoute,
  useVehicles,
} from "@/lib/simulator/api-hooks";
import { useSimulator } from "@/lib/simulator/state";
import {
  DAY_LABELS,
  VEHICLE_TYPE_LABELS,
  type RouteDetail,
  type Vehicle,
} from "@/lib/simulator/types";

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

function formatEuro(n: number): string {
  return n.toLocaleString("fr-BE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  });
}

export function RouteEditor({ producerId }: { producerId: string }) {
  const { state, dispatch } = useSimulator();
  const routeId = state.activeRouteId!;
  const { data: route, isLoading, isError, error } = useRoute(routeId);
  const { data: vehiclesPage } = useVehicles(producerId);
  const lockStatus = useRouteLockStatus(routeId);

  const deleteRoute = useDeleteRoute(producerId);
  const duplicateRoute = useDuplicateRoute(producerId);
  const validateRoute = useValidateRoute(producerId, routeId);
  const optimizeRoute = useOptimizeRoute(producerId, routeId);

  // Distance/durée routières calculées en direct via /geo/route (mis à jour
  // à chaque changement de stops) — complète les totaux serveur de la route.
  const { data: producer } = useProducer(producerId);
  const depotCoords = useProducerCoords(producer?.address);
  const stops = route?.stops ?? [];
  const routingWaypoints = depotCoords
    ? [
        { latitude: depotCoords.lat, longitude: depotCoords.lon },
        ...[...stops]
          .sort((a, b) => a.sequence - b.sequence)
          .filter((s) => s.latitude != null && s.longitude != null)
          .map((s) => ({
            latitude: s.latitude as number,
            longitude: s.longitude as number,
          })),
        { latitude: depotCoords.lat, longitude: depotCoords.lon },
      ]
    : [];
  const { data: routing, isFetching: routingFetching } = useComputeRoute(
    routingWaypoints,
    false,
  );

  const [editingMeta, setEditingMeta] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [confirmValidate, setConfirmValidate] = useState(false);

  const goBack = () => dispatch({ type: "setActiveRoute", routeId: null });

  if (isLoading) {
    return (
      <section className="catl-section catl-section--info">
        <p className="text-sm text-catl-text">Chargement du trajet…</p>
      </section>
    );
  }

  if (isError || !route) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <section className="catl-section catl-section--danger">
        <p className="text-sm text-catl-danger">
          {notFound
            ? "Ce trajet n'existe plus."
            : "Impossible de charger le trajet."}
        </p>
        <div className="mt-2">
          <Button size="sm" variant="secondary" onClick={goBack}>
            Retour aux trajets
          </Button>
        </div>
      </section>
    );
  }

  const vehicle: Vehicle | null = route.vehicleId
    ? (vehiclesPage?.items ?? []).find((v) => v.id === route.vehicleId) ?? null
    : null;
  // Un trajet validé reste éditable tant qu'on n'est pas le jour même. Les
  // statuts terminaux (completed/cancelled) verrouillent tout.
  const { isLocked, isValidated, isScheduledToday } = lockStatus;
  const stopsCount = route.stops?.length ?? 0;
  const hasVehicle = !!route.vehicleId;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
          >
            Retour
          </Button>
          <h2 className="text-lg font-bold text-catl-primary truncate">
            {route.name}
          </h2>
          <RouteStatusBadge status={route.status} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {!isLocked && !editingMeta && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Pencil className="w-3.5 h-3.5" />}
              onClick={() => setEditingMeta(true)}
            >
              Éditer
            </Button>
          )}
          {!isLocked && route.status === "draft" && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              disabled={stopsCount <= 2 || optimizeRoute.isPending}
              onClick={async () => {
                try {
                  await optimizeRoute.mutateAsync();
                  toast.success("Ordre des arrêts optimisé.");
                } catch (err) {
                  toast.error(
                    err instanceof ApiError
                      ? err.message
                      : "Optimisation impossible",
                  );
                }
              }}
              title={
                stopsCount <= 2
                  ? "Ajoute au moins 3 arrêts pour optimiser"
                  : undefined
              }
            >
              Optimiser
            </Button>
          )}
          {!isLocked && route.status === "draft" && (
            <Button
              size="sm"
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              disabled={
                stopsCount === 0 || !hasVehicle || validateRoute.isPending
              }
              onClick={() => setConfirmValidate(true)}
              title={
                stopsCount === 0
                  ? "Au moins un arrêt requis pour valider"
                  : !hasVehicle
                    ? "Un véhicule est requis pour valider"
                    : undefined
              }
            >
              Valider
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Copy className="w-3.5 h-3.5" />}
            onClick={async () => {
              try {
                const copy = await duplicateRoute.mutateAsync(route.id);
                toast.success("Trajet dupliqué.");
                dispatch({ type: "setActiveRoute", routeId: copy.id });
              } catch (err) {
                toast.error(
                  err instanceof ApiError
                    ? err.message
                    : "Duplication impossible",
                );
              }
            }}
          >
            Dupliquer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-catl-danger hover:bg-red-50"
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={() => setPendingDelete(true)}
          >
            Supprimer
          </Button>
        </div>
      </div>

      {isLocked && (
        <div className="catl-section catl-section--info flex items-start gap-3">
          <Lock className="w-4 h-4 text-catl-info mt-0.5 shrink-0" />
          <div className="text-sm text-catl-text">
            {isValidated && isScheduledToday ? (
              <>
                Ce trajet est prévu <strong>aujourd&apos;hui</strong> — il est
                verrouillé. Utilise <strong>Dupliquer</strong> pour repartir
                d&apos;une copie en brouillon.
              </>
            ) : (
              <>
                Ce trajet est <strong>{route.status}</strong> — il est
                verrouillé. Utilise <strong>Dupliquer</strong> pour reprendre
                son édition sur une copie en brouillon.
              </>
            )}
          </div>
        </div>
      )}
      {isValidated && !isLocked && (
        <div className="catl-section catl-section--info text-sm text-catl-text">
          Trajet <strong>validé</strong> — encore modifiable jusqu&apos;au jour
          du départ.
        </div>
      )}

      {editingMeta && !isLocked && (
        <RouteForm
          producerId={producerId}
          route={route}
          onSaved={() => setEditingMeta(false)}
          onCancel={() => setEditingMeta(false)}
        />
      )}

      {!editingMeta && (
        <div className="catl-section catl-section--info">
          <div className="text-xs text-catl-text flex flex-wrap gap-x-4 gap-y-2">
            {route.dayOfWeek && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {DAY_LABELS[route.dayOfWeek]}
              </span>
            )}
            {route.scheduledDate && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {route.scheduledDate}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Truck className="w-3 h-3" />
              {vehicle ? VEHICLE_TYPE_LABELS[vehicle.type] : "Aucun véhicule"}
            </span>
            <span>{stopsCount} arrêt{stopsCount > 1 ? "s" : ""}</span>
            {/* Distance/durée routières live via /geo/route, fallback sur le snapshot serveur. */}
            {routing?.distanceKm != null ? (
              <span className="font-semibold text-catl-primary">
                {routing.distanceKm.toFixed(1)} km
              </span>
            ) : route.distanceKm != null ? (
              <span>{route.distanceKm.toFixed(1)} km</span>
            ) : routingFetching ? (
              <span className="italic">calcul…</span>
            ) : null}
            {routing?.durationMin != null ? (
              <span className="font-semibold text-catl-primary">
                {formatDuration(routing.durationMin)}
              </span>
            ) : route.durationMin != null ? (
              <span>{formatDuration(route.durationMin)}</span>
            ) : null}
            {route.totalCost != null && (
              <span>{route.totalCost.toFixed(2)} €</span>
            )}
            {route.totalRevenue != null && (
              <span>{route.totalRevenue.toFixed(2)} € CA</span>
            )}
          </div>
        </div>
      )}

      <RouteCostBreakdown
        route={route}
        vehicle={vehicle}
        distanceKm={routing?.distanceKm ?? route.distanceKm ?? null}
        durationMin={routing?.durationMin ?? route.durationMin ?? null}
      />

      <StopsList
        route={route}
        producerId={producerId}
        vehicle={vehicle}
        readOnly={isLocked}
      />

      <ConfirmDialog
        open={pendingDelete}
        onOpenChange={setPendingDelete}
        title="Supprimer ce trajet ?"
        description={
          <span>
            Le trajet <strong>{route.name}</strong> et ses arrêts seront
            supprimés.
          </span>
        }
        loading={deleteRoute.isPending}
        onConfirm={async () => {
          try {
            await deleteRoute.mutateAsync(route.id);
            toast.success("Trajet supprimé.");
            setPendingDelete(false);
            dispatch({ type: "setActiveRoute", routeId: null });
          } catch (err) {
            toast.error(
              err instanceof ApiError ? err.message : "Suppression impossible",
            );
            setPendingDelete(false);
          }
        }}
      />

      <ConfirmDialog
        open={confirmValidate}
        onOpenChange={setConfirmValidate}
        title="Valider ce trajet ?"
        description={
          <span>
            Une fois validé, le trajet restera modifiable jusqu&apos;au jour du
            départ, puis sera automatiquement <strong>verrouillé</strong>.
          </span>
        }
        variant="primary"
        confirmLabel="Valider"
        loading={validateRoute.isPending}
        onConfirm={async () => {
          try {
            await validateRoute.mutateAsync();
            toast.success("Trajet validé.");
            setConfirmValidate(false);
          } catch (err) {
            if (err instanceof ApiError && err.status === 422) {
              toast.error(err.message || "Au moins un arrêt requis.");
            } else if (err instanceof ApiError && err.status === 409) {
              toast.error("Trajet déjà verrouillé.");
            } else {
              toast.error(
                err instanceof ApiError ? err.message : "Validation impossible",
              );
            }
            setConfirmValidate(false);
          }
        }}
      />
    </section>
  );
}

function RouteCostBreakdown({
  route,
  vehicle,
  distanceKm,
  durationMin,
}: {
  route: RouteDetail;
  vehicle: Vehicle | null;
  distanceKm: number | null;
  durationMin: number | null;
}) {
  if (!vehicle) {
    return (
      <div className="catl-section catl-section--info">
        <p className="text-xs italic text-catl-text">
          Associe un véhicule au trajet pour obtenir le détail des coûts.
        </p>
      </div>
    );
  }

  const stops = route.stops ?? [];
  const totalStopDurationMin = stops.reduce(
    (sum, s) => sum + (s.durationMin ?? 0),
    0,
  );
  const drivingDurationMin = Math.max(
    0,
    (durationMin ?? 0) - totalStopDurationMin,
  );
  const totalDurationMin = Math.max(
    durationMin ?? 0,
    drivingDurationMin + totalStopDurationMin,
  );

  const hourlyCost = vehicle.hourlyCost ?? 0;
  const rhCost = (totalDurationMin / 60) * hourlyCost;
  const rhDrivingCost = (drivingDurationMin / 60) * hourlyCost;
  const rhStopsCost = (totalStopDurationMin / 60) * hourlyCost;

  const km = distanceKm ?? 0;
  const fuelCost =
    km * ((vehicle.consumptionL100Km ?? 0) / 100) * (vehicle.fuelPrice ?? 0);
  const amortCost = km * (vehicle.amortizationEurKm ?? 0);

  const computedTotal = rhCost + fuelCost + amortCost;
  const totalRevenue = route.totalRevenue ?? 0;
  const margin = totalRevenue - computedTotal;
  const marginPositive = margin >= 0;

  const parts = [
    {
      key: "rh",
      label: "Coût RH",
      amount: rhCost,
      color: "#e67e22",
      icon: <Users className="w-3.5 h-3.5" />,
      detail:
        rhDrivingCost > 0 && rhStopsCost > 0
          ? `${formatDuration(drivingDurationMin)} route + ${formatDuration(totalStopDurationMin)} arrêts × ${hourlyCost.toFixed(2)} €/h`
          : `${formatDuration(totalDurationMin)} × ${hourlyCost.toFixed(2)} €/h`,
    },
    {
      key: "fuel",
      label: "Carburant",
      amount: fuelCost,
      color: "#3498db",
      icon: <Fuel className="w-3.5 h-3.5" />,
      detail: `${km.toFixed(1)} km × ${(vehicle.consumptionL100Km ?? 0).toFixed(1)} L/100 × ${(vehicle.fuelPrice ?? 0).toFixed(2)} €/L`,
    },
    {
      key: "amort",
      label: "Amort. / entretien",
      amount: amortCost,
      color: "#8e44ad",
      icon: <Wrench className="w-3.5 h-3.5" />,
      detail: `${km.toFixed(1)} km × ${(vehicle.amortizationEurKm ?? 0).toFixed(2)} €/km`,
    },
  ];

  return (
    <section className="rounded-lg border-2 border-catl-primary/10 bg-gradient-to-br from-white to-catl-bg/50 p-4 shadow-sm">
      <header className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-catl-primary/10 text-catl-primary">
            <Receipt className="w-4 h-4" />
          </span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-catl-text">
              Coût total estimé
            </div>
            <div className="text-2xl font-extrabold text-catl-primary leading-tight tabular-nums">
              {formatEuro(computedTotal)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {totalRevenue > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-catl-accent/10 text-catl-primary">
              <Coins className="w-3 h-3" />
              CA {formatEuro(totalRevenue)}
            </span>
          )}
          {totalRevenue > 0 && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                marginPositive
                  ? "bg-catl-success/10 text-catl-success"
                  : "bg-catl-danger/10 text-catl-danger"
              }`}
            >
              Marge {marginPositive ? "+" : ""}
              {formatEuro(margin)}
            </span>
          )}
        </div>
      </header>

      {/* Barre empilée des trois postes */}
      {computedTotal > 0 && (
        <div className="mb-3 h-2.5 w-full rounded-full bg-gray-100 overflow-hidden flex">
          {parts.map((p) => (
            <div
              key={p.key}
              style={{
                flexGrow: p.amount,
                background: p.color,
              }}
              className="h-full transition-[flex-grow] duration-200"
              title={`${p.label} — ${formatEuro(p.amount)}`}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {parts.map((p) => {
          const pct =
            computedTotal > 0 ? (p.amount / computedTotal) * 100 : 0;
          return (
            <div
              key={p.key}
              className="rounded-md border border-gray-100 bg-white px-3 py-2"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-catl-text">
                <span style={{ color: p.color }}>{p.icon}</span>
                {p.label}
                <span className="ml-auto tabular-nums text-catl-text/70">
                  {pct.toFixed(0)}%
                </span>
              </div>
              <div
                className="mt-1 text-base font-bold tabular-nums"
                style={{ color: p.color }}
              >
                {formatEuro(p.amount)}
              </div>
              <div className="text-[11px] text-catl-text/80 mt-0.5">
                {p.detail}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
