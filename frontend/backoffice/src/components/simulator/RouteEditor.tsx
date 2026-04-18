"use client";

import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Copy,
  Lock,
  Pencil,
  Sparkles,
  Trash2,
  Truck,
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
  useValidateRoute,
  useVehicles,
} from "@/lib/simulator/api-hooks";
import { useSimulator } from "@/lib/simulator/state";
import {
  DAY_LABELS,
  VEHICLE_TYPE_LABELS,
  type Vehicle,
} from "@/lib/simulator/types";

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

export function RouteEditor({ producerId }: { producerId: string }) {
  const { state, dispatch } = useSimulator();
  const routeId = state.activeRouteId!;
  const { data: route, isLoading, isError, error } = useRoute(routeId);
  const { data: vehiclesPage } = useVehicles(producerId);

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
  const isLocked = route.status !== "draft";
  const stopsCount = route.stops?.length ?? 0;

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
          {!isLocked && (
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
          {!isLocked && (
            <Button
              size="sm"
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              disabled={stopsCount === 0 || validateRoute.isPending}
              onClick={() => setConfirmValidate(true)}
              title={
                stopsCount === 0
                  ? "Au moins un arrêt requis pour valider"
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
            Ce trajet est <strong>{route.status}</strong> — il est verrouillé.
            Utilise <strong>Dupliquer</strong> pour reprendre son édition sur
            une copie en brouillon.
          </div>
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

      <StopsList route={route} producerId={producerId} readOnly={isLocked} />

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
            Une fois validé, le trajet sera <strong>verrouillé</strong> et ne
            pourra plus être modifié (il faudra le dupliquer pour l&apos;éditer
            à nouveau).
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
