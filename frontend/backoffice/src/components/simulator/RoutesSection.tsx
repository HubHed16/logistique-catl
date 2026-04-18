"use client";

import {
  Calendar,
  Copy,
  MapPin,
  Navigation,
  Plus,
  Trash2,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RouteForm } from "@/components/simulator/RouteForm";
import { RouteStatusBadge } from "@/components/simulator/RouteStatusBadge";
import {
  ApiError,
  useDeleteRoute,
  useDuplicateRoute,
  useRoutes,
  useVehicles,
} from "@/lib/simulator/api-hooks";
import { useSimulator } from "@/lib/simulator/state";
import {
  DAY_LABELS,
  VEHICLE_TYPE_LABELS,
  type ApiRoute,
  type Vehicle,
} from "@/lib/simulator/types";

export function RoutesSection({ producerId }: { producerId: string }) {
  const { dispatch } = useSimulator();
  const { data, isLoading, isError } = useRoutes(producerId);
  const { data: vehiclesPage } = useVehicles(producerId);
  const vehiclesById = new Map<string, Vehicle>(
    (vehiclesPage?.items ?? []).map((v) => [v.id, v]),
  );
  const deleteRoute = useDeleteRoute(producerId);
  const duplicateRoute = useDuplicateRoute(producerId);

  const [adding, setAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ApiRoute | null>(null);

  const routes = data?.items ?? [];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-catl-primary flex items-center gap-2">
          <Navigation className="w-5 h-5 text-catl-accent" />
          Trajets
          <span className="text-sm font-normal text-catl-text">
            ({routes.length})
          </span>
        </h2>
        {!adding && (
          <Button
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setAdding(true)}
          >
            Nouveau trajet
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="text-sm text-catl-text">Chargement des trajets…</div>
      )}
      {isError && (
        <div className="text-sm text-catl-danger">
          Impossible de charger les trajets. Le back-end est-il démarré ?
        </div>
      )}

      {adding && (
        <RouteForm
          producerId={producerId}
          onSaved={(route) => {
            setAdding(false);
            dispatch({ type: "setActiveRoute", routeId: route.id });
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {!isLoading && !isError && routes.length === 0 && !adding && (
        <div className="catl-section catl-section--info">
          <p className="text-sm text-catl-text italic">
            Aucun trajet pour ce producteur. Crée-en un avec le bouton ci-dessus.
          </p>
        </div>
      )}

      {routes.map((r) => (
        <RouteCard
          key={r.id}
          route={r}
          vehicle={r.vehicleId ? vehiclesById.get(r.vehicleId) ?? null : null}
          onOpen={() =>
            dispatch({ type: "setActiveRoute", routeId: r.id })
          }
          onDuplicate={async () => {
            try {
              const copy = await duplicateRoute.mutateAsync(r.id);
              toast.success("Trajet dupliqué.");
              dispatch({ type: "setActiveRoute", routeId: copy.id });
            } catch (err) {
              toast.error(
                err instanceof ApiError ? err.message : "Duplication impossible",
              );
            }
          }}
          onDelete={() => setPendingDelete(r)}
        />
      ))}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Supprimer ce trajet ?"
        description={
          pendingDelete && (
            <span>
              Le trajet <strong>{pendingDelete.name}</strong> sera supprimé.
            </span>
          )
        }
        loading={deleteRoute.isPending}
        onConfirm={async () => {
          if (!pendingDelete) return;
          try {
            await deleteRoute.mutateAsync(pendingDelete.id);
            toast.success("Trajet supprimé.");
            setPendingDelete(null);
          } catch (err) {
            toast.error(
              err instanceof ApiError ? err.message : "Suppression impossible",
            );
            setPendingDelete(null);
          }
        }}
      />
    </section>
  );
}

function RouteCard({
  route,
  vehicle,
  onOpen,
  onDuplicate,
  onDelete,
}: {
  route: ApiRoute;
  vehicle: Vehicle | null;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const hasStats =
    route.distanceKm != null ||
    route.durationMin != null ||
    route.totalCost != null;

  return (
    <div className="catl-section catl-section--info">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-bold text-catl-primary truncate">
              {route.name}
            </span>
            <RouteStatusBadge status={route.status} />
          </div>
          <div className="text-xs text-catl-text flex flex-wrap gap-x-3 gap-y-1">
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
            {vehicle && (
              <span className="inline-flex items-center gap-1">
                <Truck className="w-3 h-3" />
                {VEHICLE_TYPE_LABELS[vehicle.type]}
              </span>
            )}
            {hasStats && (
              <>
                {route.distanceKm != null && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {route.distanceKm.toFixed(1)} km
                  </span>
                )}
                {route.durationMin != null && (
                  <span>{route.durationMin} min</span>
                )}
                {route.totalCost != null && (
                  <span>{route.totalCost.toFixed(2)} €</span>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <Button size="sm" onClick={onOpen}>
            Ouvrir
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Copy className="w-3.5 h-3.5" />}
            onClick={onDuplicate}
          >
            Dupliquer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-catl-danger hover:bg-red-50"
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={onDelete}
            aria-label="Supprimer le trajet"
          >
            Suppr.
          </Button>
        </div>
      </div>
    </div>
  );
}
