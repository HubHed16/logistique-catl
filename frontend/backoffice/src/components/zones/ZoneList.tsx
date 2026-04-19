"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ZoneTypeBadge } from "@/components/ui/ZoneTypeBadge";
import { ApiError } from "@/lib/api";
import {
  DEFAULT_TEST_ZONE_ID,
  useDeleteZone,
  useZones,
} from "@/lib/hooks/zones";
import type { StorageZone } from "@/lib/types";

export function ZoneList() {
  const { data, isLoading, isError, error, refetch } = useZones();
  const deleteMutation = useDeleteZone();
  const [pendingDelete, setPendingDelete] = useState<StorageZone | null>(null);

  if (isLoading) {
    return <div className="text-sm text-catl-text">Chargement...</div>;
  }

  if (isError) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return (
      <div className="text-sm text-catl-danger">
        Erreur de chargement : {msg}{" "}
        <button
          type="button"
          className="underline"
          onClick={() => void refetch()}
        >
          réessayer
        </button>
      </div>
    );
  }

  const zones = data ?? [];

  if (zones.length === 0) {
    return (
      <div className="catl-card text-center py-10">
        <p className="text-catl-text mb-4">
          Aucune zone de stockage déclarée pour le moment.
        </p>
        <Link href="/zones/new">
          <Button>Créer la première zone</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="catl-card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-catl-bg text-catl-text">
            <tr>
              <Th>Nom</Th>
              <Th>Type</Th>
              <Th align="right">Cible (°C)</Th>
              <Th align="right">Plage</Th>
              <Th align="right"># empl.</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {zones.map((z) => {
              const isDefaultTest = z.id === DEFAULT_TEST_ZONE_ID;
              return (
                <tr
                  key={z.id}
                  className="border-t border-gray-100 hover:bg-catl-bg/60 transition-colors"
                >
                  <Td>
                    {isDefaultTest ? (
                      <span className="font-semibold text-catl-primary inline-flex items-center gap-2">
                        {z.name}
                        <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-catl-accent/10 text-catl-accent">
                          Par défaut
                        </span>
                      </span>
                    ) : (
                      <Link
                        href={`/zones/${z.id}`}
                        className="font-semibold text-catl-primary hover:text-catl-accent"
                      >
                        {z.name}
                      </Link>
                    )}
                  </Td>
                  <Td>
                    <ZoneTypeBadge type={z.type} />
                  </Td>
                  <Td align="right" mono>
                    {z.targetTemp != null ? z.targetTemp.toFixed(1) : "—"}
                  </Td>
                  <Td align="right" mono>
                    {z.tempMin != null && z.tempMax != null
                      ? `${z.tempMin.toFixed(1)} → ${z.tempMax.toFixed(1)}`
                      : "—"}
                  </Td>
                  <Td align="right" mono>
                    {z.locationsCount ?? 0}
                  </Td>
                  <Td align="right">
                    {isDefaultTest ? (
                      <span className="text-xs italic text-catl-text/60">
                        —
                      </span>
                    ) : (
                      <div className="inline-flex gap-1">
                        <Link href={`/zones/${z.id}/edit`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Pencil className="w-3.5 h-3.5" />}
                            aria-label={`Modifier ${z.name}`}
                          >
                            Éditer
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingDelete(z)}
                          className="text-catl-danger hover:bg-red-50"
                          leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                          aria-label={`Supprimer ${z.name}`}
                        >
                          Suppr.
                        </Button>
                      </div>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Supprimer cette zone ?"
        description={
          pendingDelete && (
            <span>
              La zone <strong>{pendingDelete.name}</strong> sera définitivement
              supprimée. Si des emplacements y sont rattachés, l&apos;opération
              sera refusée.
            </span>
          )
        }
        confirmLabel="Supprimer"
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!pendingDelete) return;
          try {
            await deleteMutation.mutateAsync(pendingDelete.id);
            toast.success(`Zone "${pendingDelete.name}" supprimée.`);
            setPendingDelete(null);
          } catch (err) {
            const msg =
              err instanceof ApiError ? err.message : "Suppression impossible.";
            toast.error(msg);
            setPendingDelete(null);
          }
        }}
      />
    </>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-4 py-3 text-xs font-bold uppercase tracking-wide text-${
        align === "right" ? "right" : "left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  mono = false,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  mono?: boolean;
}) {
  return (
    <td
      className={`px-4 py-3 align-middle text-${
        align === "right" ? "right" : "left"
      } ${mono ? "font-mono tabular-nums" : ""}`}
    >
      {children}
    </td>
  );
}
