"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  GripVertical,
  Package,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StopForm } from "@/components/simulator/StopForm";
import {
  ApiError,
  useDeleteStop,
  useReorderStops,
} from "@/lib/simulator/api-hooks";
import {
  STOP_OPERATION_LABELS,
  type ApiStop,
  type RouteDetail,
} from "@/lib/simulator/types";

type Props = {
  route: RouteDetail;
  producerId: string;
  readOnly?: boolean;
};

export function StopsList({ route, producerId, readOnly }: Props) {
  const deleteStop = useDeleteStop(route.id, producerId);
  const reorderStops = useReorderStops(route.id, producerId);

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiStop | null>(null);

  // Liste triée par sequence. On alimente un état local pour que le DnD
  // puisse réordonner de façon optimiste avant le retour serveur.
  const serverStops = useMemo(
    () =>
      [...(route.stops ?? [])].sort((a, b) => a.sequence - b.sequence),
    [route.stops],
  );
  const [localStops, setLocalStops] = useState<ApiStop[]>(serverStops);
  // Sync à chaque changement côté serveur (après mutation réussie).
  const serverIds = serverStops.map((s) => s.id).join(",");
  const localIds = localStops.map((s) => s.id).join(",");
  if (serverIds !== localIds) {
    // Sequence ou composition différente : re-sync.
    setLocalStops(serverStops);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localStops.findIndex((s) => s.id === active.id);
    const newIndex = localStops.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(localStops, oldIndex, newIndex);
    setLocalStops(reordered);
    try {
      await reorderStops.mutateAsync(reordered.map((s) => s.id));
    } catch (err) {
      // Rollback visuel — l'invalidation dans onError du hook synchronise
      // aussi le cache, donc le re-sync local ci-dessus se déclenchera.
      setLocalStops(serverStops);
      if (err instanceof ApiError && err.status === 409) {
        toast.error("Trajet verrouillé — impossible de réordonner.");
      } else {
        toast.error(err instanceof ApiError ? err.message : "Reorder impossible");
      }
    }
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-catl-primary flex items-center gap-2">
          <Package className="w-4 h-4 text-catl-accent" />
          Arrêts
          <span className="text-xs font-normal text-catl-text">
            ({localStops.length})
          </span>
        </h3>
        {!readOnly && !adding && (
          <Button
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
          >
            Ajouter un arrêt
          </Button>
        )}
      </div>

      {adding && !readOnly && (
        <StopForm
          producerId={producerId}
          routeId={route.id}
          onSaved={() => setAdding(false)}
          onCancel={() => setAdding(false)}
        />
      )}

      {localStops.length === 0 && !adding && (
        <div className="catl-section catl-section--info">
          <p className="text-sm text-catl-text italic">
            Aucun arrêt pour l&apos;instant. {readOnly ? "" : "Ajoute-en un avec le bouton ci-dessus."}
          </p>
        </div>
      )}

      {localStops.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localStops.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {localStops.map((stop) =>
                editingId === stop.id && !readOnly ? (
                  <li key={stop.id}>
                    <StopForm
                      producerId={producerId}
                      routeId={route.id}
                      stop={stop}
                      onSaved={() => setEditingId(null)}
                      onCancel={() => setEditingId(null)}
                    />
                  </li>
                ) : (
                  <SortableStopRow
                    key={stop.id}
                    stop={stop}
                    readOnly={!!readOnly}
                    onEdit={() => {
                      setEditingId(stop.id);
                      setAdding(false);
                    }}
                    onDelete={() => setPendingDelete(stop)}
                  />
                ),
              )}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Supprimer cet arrêt ?"
        description={
          pendingDelete && (
            <span>
              L&apos;arrêt #{pendingDelete.sequence}{" "}
              {pendingDelete.address
                ? `(${pendingDelete.address})`
                : ""}{" "}
              sera supprimé. Les séquences seront renumérotées.
            </span>
          )
        }
        loading={deleteStop.isPending}
        onConfirm={async () => {
          if (!pendingDelete) return;
          try {
            await deleteStop.mutateAsync(pendingDelete.id);
            toast.success("Arrêt supprimé.");
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

function SortableStopRow({
  stop,
  readOnly,
  onEdit,
  onDelete,
}: {
  stop: ApiStop;
  readOnly: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stop.id, disabled: readOnly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const hasCoords = stop.latitude != null && stop.longitude != null;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="catl-section catl-section--info"
    >
      <div className="flex items-center gap-3 flex-wrap">
        {!readOnly && (
          <button
            type="button"
            className="text-catl-text/60 hover:text-catl-primary cursor-grab active:cursor-grabbing touch-none"
            aria-label="Réordonner"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-catl-accent text-white text-xs font-bold shrink-0">
          {stop.sequence}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-catl-primary truncate">
              {stop.address || "(Adresse non renseignée)"}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-catl-bg text-catl-text">
              {STOP_OPERATION_LABELS[stop.operation]}
            </span>
            {!hasCoords && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                <AlertTriangle className="w-3 h-3" />
                Pas sur la carte
              </span>
            )}
          </div>
          <div className="text-xs text-catl-text flex flex-wrap gap-x-3 mt-1">
            <span>{(stop.amountEur ?? 0).toFixed(2)} €</span>
            <span>{stop.durationMin ?? 0} min</span>
            {stop.distanceFromPrevKm != null && (
              <span>+{stop.distanceFromPrevKm.toFixed(1)} km</span>
            )}
          </div>
        </div>
        {!readOnly && (
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
              aria-label="Supprimer l'arrêt"
            >
              Suppr.
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}
