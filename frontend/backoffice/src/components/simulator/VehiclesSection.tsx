"use client";

import { Pencil, Plus, Snowflake, Trash2, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { VehicleForm } from "@/components/simulator/VehicleForm";
import {
  ApiError,
  useDeleteVehicle,
  useVehicles,
} from "@/lib/simulator/api-hooks";
import {
  DRIVER_LABELS,
  FUEL_LABELS,
  VEHICLE_TYPE_LABELS,
  type Vehicle,
} from "@/lib/simulator/types";

export function VehiclesSection({ producerId }: { producerId: string }) {
  const { data, isLoading, isError } = useVehicles(producerId);
  const deleteMutation = useDeleteVehicle(producerId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Vehicle | null>(null);

  const vehicles = data?.items ?? [];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-catl-primary flex items-center gap-2">
          <Truck className="w-5 h-5 text-catl-info" />
          Véhicules
          <span className="text-sm font-normal text-catl-text">
            ({vehicles.length})
          </span>
        </h2>
        {!adding && (
          <Button
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
          >
            Nouveau véhicule
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="text-sm text-catl-text">Chargement des véhicules…</div>
      )}
      {isError && (
        <div className="text-sm text-catl-danger">
          Impossible de charger les véhicules.
        </div>
      )}

      {adding && (
        <VehicleForm
          producerId={producerId}
          onSaved={() => setAdding(false)}
          onCancel={() => setAdding(false)}
        />
      )}

      {!isLoading && !isError && vehicles.length === 0 && !adding && (
        <div className="catl-section catl-section--info">
          <p className="text-sm text-catl-text italic">
            Aucun véhicule enregistré pour ce producteur. Ajoute-en un avec
            le bouton ci-dessus.
          </p>
        </div>
      )}

      {vehicles.map((v) =>
        editingId === v.id ? (
          <VehicleForm
            key={v.id}
            producerId={producerId}
            vehicle={v}
            onSaved={() => setEditingId(null)}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <VehicleCard
            key={v.id}
            vehicle={v}
            onEdit={() => {
              setEditingId(v.id);
              setAdding(false);
            }}
            onDelete={() => setPendingDelete(v)}
          />
        ),
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Supprimer ce véhicule ?"
        description={
          pendingDelete && (
            <span>
              Le véhicule{" "}
              <strong>{VEHICLE_TYPE_LABELS[pendingDelete.type]}</strong> (
              {FUEL_LABELS[pendingDelete.fuel]}) sera supprimé définitivement.
            </span>
          )
        }
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!pendingDelete) return;
          try {
            await deleteMutation.mutateAsync(pendingDelete.id);
            toast.success("Véhicule supprimé.");
            setPendingDelete(null);
          } catch (err) {
            const msg =
              err instanceof ApiError
                ? err.message
                : "Suppression impossible.";
            toast.error(msg);
            setPendingDelete(null);
          }
        }}
      />
    </section>
  );
}

function VehicleCard({
  vehicle,
  onEdit,
  onDelete,
}: {
  vehicle: Vehicle;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="catl-section catl-section--info">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-catl-primary">
              {VEHICLE_TYPE_LABELS[vehicle.type]}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-catl-bg text-catl-text">
              {FUEL_LABELS[vehicle.fuel]}
            </span>
            {vehicle.refrigerated && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-catl-info/15 text-catl-info">
                <Snowflake className="w-3 h-3" /> Réfrigéré
              </span>
            )}
          </div>
          <div className="text-xs text-catl-text flex flex-wrap gap-x-3 gap-y-1">
            <span>
              Conso{" "}
              <span className="font-mono text-catl-primary">
                {vehicle.consumptionL100Km ?? "—"}
              </span>
            </span>
            <span>
              Prix{" "}
              <span className="font-mono text-catl-primary">
                {vehicle.fuelPrice ?? "—"} €
              </span>
            </span>
            <span>
              Amort.{" "}
              <span className="font-mono text-catl-primary">
                {vehicle.amortizationEurKm ?? "—"} €/km
              </span>
            </span>
            <span className="w-full" />
            <span>
              {vehicle.driverType
                ? DRIVER_LABELS[vehicle.driverType]
                : "—"}
            </span>
            <span>
              {vehicle.hourlyCost ?? "—"} €/h
            </span>
            <span>Prépa {vehicle.prepTimeMin} min</span>
            <span>Chargt {vehicle.loadingTimeMin} min</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Pencil className="w-3.5 h-3.5" />}
            onClick={onEdit}
          >
            Éditer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-catl-danger hover:bg-red-50"
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={onDelete}
            aria-label="Supprimer le véhicule"
          >
            Suppr.
          </Button>
        </div>
      </div>
    </div>
  );
}
