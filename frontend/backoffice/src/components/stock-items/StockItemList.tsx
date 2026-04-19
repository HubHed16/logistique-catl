"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Select } from "@/components/ui/Field";
import { ApiError } from "@/lib/api";
import {
  useStockItems,
  useExpiringStockItems,
  useLowStockItems,
  useUpdateStockItemStatus,
  useDeleteStockItem,
} from "@/lib/hooks/stock-items";
import { useAllProducts } from "@/lib/hooks/products";
import { useAllLocations } from "@/lib/hooks/zones";
import type { StockItem, StockItemStatus } from "@/lib/types";

type Mode = "all" | "expiring" | "low-stock";

const STATUS_OPTIONS: { value: StockItemStatus | ""; label: string }[] = [
  { value: "", label: "Tous les statuts" },
  { value: "AVAILABLE", label: "Disponible" },
  { value: "RESERVED", label: "Réservé" },
  { value: "BLOCKED", label: "Bloqué" },
  { value: "CONSUMED", label: "Consommé" },
];

const STATUS_STYLES: Record<StockItemStatus, { bg: string; text: string; label: string }> = {
  AVAILABLE: { bg: "bg-green-100", text: "text-green-700", label: "Disponible" },
  RESERVED: { bg: "bg-blue-100", text: "text-blue-700", label: "Réservé" },
  BLOCKED: { bg: "bg-red-100", text: "text-red-700", label: "Bloqué" },
  CONSUMED: { bg: "bg-gray-100", text: "text-gray-500", label: "Consommé" },
};

function StatusBadge({ status }: { status: StockItemStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function isExpiringSoon(iso: string | null): boolean {
  if (!iso) return false;
  const diff = new Date(iso).getTime() - Date.now();
  return diff > 0 && diff < 7 * 24 * 3600 * 1000;
}

export function StockItemList() {
  const [mode, setMode] = useState<Mode>("all");
  const [statusFilter, setStatusFilter] = useState<StockItemStatus | "">("");
  const [pendingStatusChange, setPendingStatusChange] = useState<StockItem | null>(null);
  const [newStatus, setNewStatus] = useState<StockItemStatus>("AVAILABLE");
  const [statusReason, setStatusReason] = useState("");
  const [pendingDelete, setPendingDelete] = useState<StockItem | null>(null);

  const baseQuery = useStockItems(statusFilter || undefined);
  const expiringQuery = useExpiringStockItems(mode === "expiring");
  const lowStockQuery = useLowStockItems(mode === "low-stock");

  const productsQuery = useAllProducts();
  const locationsQuery = useAllLocations();

  const updateStatus = useUpdateStockItemStatus();
  const deleteItem = useDeleteStockItem();

  const productsMap = useMemo(
    () => new Map((productsQuery.data ?? []).map((p) => [p.id, p])),
    [productsQuery.data],
  );
  const locationsMap = useMemo(
    () => new Map((locationsQuery.data ?? []).map((l) => [l.id, l])),
    [locationsQuery.data],
  );

  const activeQuery =
    mode === "expiring" ? expiringQuery
    : mode === "low-stock" ? lowStockQuery
    : baseQuery;

  const { data, isLoading, isError, error, refetch } = activeQuery;

  const items = data ?? [];

  function openStatusChange(item: StockItem) {
    setNewStatus(item.status);
    setStatusReason("");
    setPendingStatusChange(item);
  }

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1">
          {(["all", "expiring", "low-stock"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); if (m !== "all") setStatusFilter(""); }}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md transition-colors border ${
                mode === m
                  ? "bg-catl-accent text-white border-catl-accent"
                  : "bg-white text-catl-text border-gray-200 hover:bg-catl-bg"
              }`}
            >
              {m === "all" ? "Tout" : m === "expiring" ? "Expiration proche" : "Stock faible"}
            </button>
          ))}
        </div>

        {mode === "all" && (
          <Select
            className="w-48"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StockItemStatus | "")}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        )}

        <span className="ml-auto text-xs text-catl-text">
          {isLoading ? "Chargement…" : `${items.length} article${items.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {isError && (
        <div className="text-sm text-catl-danger mb-4">
          Erreur : {error instanceof Error ? error.message : "inconnue"}{" "}
          <button type="button" className="underline" onClick={() => void refetch()}>réessayer</button>
        </div>
      )}

      {!isLoading && items.length === 0 && !isError && (
        <div className="catl-card text-center py-10 text-catl-text text-sm">
          Aucun article pour ce filtre.
        </div>
      )}

      {items.length > 0 && (
        <div className="catl-card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-catl-bg text-catl-text">
              <tr>
                <Th>Lot</Th>
                <Th>Produit</Th>
                <Th align="right">Qté</Th>
                <Th>Emplacement</Th>
                <Th>Statut</Th>
                <Th>DLC / DDM</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const product = productsMap.get(item.productId);
                const location = locationsMap.get(item.locationId);
                const expSoon = isExpiringSoon(item.expirationDate ?? item.bestBefore);
                return (
                  <tr
                    key={item.id}
                    className="border-t border-gray-100 hover:bg-catl-bg/60 transition-colors"
                  >
                    <Td mono>{item.lotNumber}</Td>
                    <Td>
                      <span className="font-semibold text-catl-primary">
                        {product?.name ?? item.productId.slice(0, 8) + "…"}
                      </span>
                      {product?.category && (
                        <span className="text-catl-text text-xs ml-1">({product.category})</span>
                      )}
                    </Td>
                    <Td align="right" mono>
                      {item.quantity} {item.unit}
                    </Td>
                    <Td mono>{location?.label ?? item.locationId.slice(0, 8) + "…"}</Td>
                    <Td>
                      <StatusBadge status={item.status} />
                    </Td>
                    <Td>
                      <span className={expSoon ? "text-orange-600 font-semibold flex items-center gap-1" : ""}>
                        {expSoon && <AlertTriangle className="w-3.5 h-3.5 inline" />}
                        {formatDate(item.expirationDate ?? item.bestBefore)}
                      </span>
                    </Td>
                    <Td align="right">
                      <div className="inline-flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openStatusChange(item)}
                        >
                          Statut
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                          className="text-catl-danger hover:bg-red-50"
                          onClick={() => setPendingDelete(item)}
                        >
                          Suppr.
                        </Button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Status change dialog */}
      <ConfirmDialog
        open={!!pendingStatusChange}
        onOpenChange={(open) => { if (!open) setPendingStatusChange(null); }}
        title="Changer le statut"
        variant="primary"
        confirmLabel="Confirmer"
        loading={updateStatus.isPending}
        description={
          pendingStatusChange && (
            <div className="space-y-3">
              <p>
                Lot <strong>{pendingStatusChange.lotNumber}</strong> — statut actuel :{" "}
                <StatusBadge status={pendingStatusChange.status} />
              </p>
              <div>
                <label className="block text-xs font-semibold text-catl-text mb-1.5 uppercase tracking-wide">
                  Nouveau statut
                </label>
                <select
                  className="block w-full px-3 py-2 text-sm rounded-md border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-catl-primary/30"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as StockItemStatus)}
                >
                  {STATUS_OPTIONS.filter((o) => o.value !== "").map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {(newStatus === "BLOCKED" || newStatus === "CONSUMED") && (
                <div>
                  <label className="block text-xs font-semibold text-catl-text mb-1.5 uppercase tracking-wide">
                    Motif {newStatus === "BLOCKED" ? "(requis)" : "(optionnel)"}
                  </label>
                  <input
                    type="text"
                    className="block w-full px-3 py-2 text-sm rounded-md border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-catl-primary/30"
                    placeholder="Ex. température hors norme, DDM dépassée…"
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                  />
                </div>
              )}
            </div>
          )
        }
        onConfirm={async () => {
          if (!pendingStatusChange) return;
          try {
            await updateStatus.mutateAsync({
              id: pendingStatusChange.id,
              status: newStatus,
              reason: statusReason || undefined,
            });
            toast.success("Statut mis à jour.");
            setPendingStatusChange(null);
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Erreur");
            setPendingStatusChange(null);
          }
        }}
      />

      {/* Delete dialog */}
      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        title="Supprimer cet article ?"
        description={
          pendingDelete && (
            <span>
              Le lot <strong>{pendingDelete.lotNumber}</strong> sera définitivement supprimé du stock.
            </span>
          )
        }
        confirmLabel="Supprimer"
        loading={deleteItem.isPending}
        onConfirm={async () => {
          if (!pendingDelete) return;
          try {
            await deleteItem.mutateAsync(pendingDelete.id);
            toast.success("Article supprimé.");
            setPendingDelete(null);
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : "Suppression impossible.");
            setPendingDelete(null);
          }
        }}
      />
    </>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className={`px-4 py-3 text-xs font-bold uppercase tracking-wide text-${align === "right" ? "right" : "left"}`}>
      {children}
    </th>
  );
}

function Td({ children, align = "left", mono = false }: { children: React.ReactNode; align?: "left" | "right"; mono?: boolean }) {
  return (
    <td className={`px-4 py-3 align-middle text-${align === "right" ? "right" : "left"} ${mono ? "font-mono tabular-nums" : ""}`}>
      {children}
    </td>
  );
}
