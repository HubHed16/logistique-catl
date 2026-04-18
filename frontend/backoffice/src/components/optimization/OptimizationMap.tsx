"use client";

import "leaflet/dist/leaflet.css";

import { useMemo } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from "react-leaflet";
import type {
  OptimizationHubPickingList,
  OptimizationProducerHubTransfer,
  OptimizationStopAssignment,
} from "@/lib/simulator/types";

type ProducerNode = {
  producerId: string;
  latitude: number;
  longitude: number;
  transferCount: number;
  totalVolume: number;
};

type TransferEdge = {
  producerId: string;
  hubId: string;
  from: [number, number];
  to: [number, number];
  detourKm: number;
  detourCostEur: number;
  totalVolume: number;
  stopCount: number;
};

type StopNode = {
  stopId: string;
  routeId: string;
  producerId: string;
  sequence: number;
  mode: OptimizationStopAssignment["mode"];
  volume: number;
  latitude: number;
  longitude: number;
  hubId?: string;
};

const EUR = new Intl.NumberFormat("fr-BE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

const NUM = new Intl.NumberFormat("fr-BE", { maximumFractionDigits: 2 });

function shortId(id: string): string {
  return id.slice(0, 8);
}

function producerAnchor(
  producerId: string,
  hubs: OptimizationHubPickingList[],
  hubById: Map<string, OptimizationHubPickingList>,
  transfers: OptimizationProducerHubTransfer[],
): [number, number] | null {
  const hubIds = Array.from(
    new Set(
      transfers
        .filter((t) => t.producerId === producerId && t.totalVolume > 0)
        .map((t) => t.hubId),
    ),
  );

  if (hubIds.length === 0) {
    return null;
  }

  const validHubs = hubIds
    .map((id) => hubById.get(id))
    .filter((hub): hub is OptimizationHubPickingList => Boolean(hub));

  if (validHubs.length === 0) {
    return null;
  }

  const avgLat =
    validHubs.reduce((sum, hub) => sum + hub.latitude, 0) / validHubs.length;
  const avgLng =
    validHubs.reduce((sum, hub) => sum + hub.longitude, 0) / validHubs.length;

  const hash = Array.from(producerId).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const angle = ((hash % 360) * Math.PI) / 180;
  const radius = 0.18 + (hash % 7) * 0.01;

  return [avgLat + Math.sin(angle) * radius, avgLng + Math.cos(angle) * radius];
}

export function OptimizationMap({
  hubs,
  transfers,
  assignments,
}: {
  hubs: OptimizationHubPickingList[];
  transfers: OptimizationProducerHubTransfer[];
  assignments: OptimizationStopAssignment[];
}) {
  const hubById = useMemo(() => new Map(hubs.map((h) => [h.hubId, h])), [hubs]);

  const activeTransfers = useMemo(
    () => transfers.filter((t) => t.totalVolume > 0 || t.stopIds.length > 0),
    [transfers],
  );

  const producers = useMemo(() => {
    const byProducer = new Map<string, OptimizationProducerHubTransfer[]>();
    for (const transfer of activeTransfers) {
      const list = byProducer.get(transfer.producerId) ?? [];
      list.push(transfer);
      byProducer.set(transfer.producerId, list);
    }

    const nodes: ProducerNode[] = [];
    for (const [producerId, producerTransfers] of byProducer) {
      const anchor = producerAnchor(producerId, hubs, hubById, producerTransfers);
      if (!anchor) continue;
      nodes.push({
        producerId,
        latitude: anchor[0],
        longitude: anchor[1],
        transferCount: producerTransfers.length,
        totalVolume: producerTransfers.reduce((sum, t) => sum + t.totalVolume, 0),
      });
    }

    return nodes;
  }, [activeTransfers, hubById, hubs]);

  const producerById = useMemo(
    () => new Map(producers.map((p) => [p.producerId, p])),
    [producers],
  );

  const edges = useMemo(() => {
    const items: TransferEdge[] = [];
    for (const transfer of activeTransfers) {
      const producer = producerById.get(transfer.producerId);
      const hub = hubById.get(transfer.hubId);
      if (!producer || !hub) continue;
      items.push({
        producerId: transfer.producerId,
        hubId: transfer.hubId,
        from: [producer.latitude, producer.longitude],
        to: [hub.latitude, hub.longitude],
        detourKm: transfer.detourKm,
        detourCostEur: transfer.detourCostEur,
        totalVolume: transfer.totalVolume,
        stopCount: transfer.stopIds.length,
      });
    }
    return items;
  }, [activeTransfers, hubById, producerById]);

  const stops = useMemo<StopNode[]>(
    () =>
      assignments
        .filter(
          (a) =>
            a.latitude != null &&
            a.longitude != null &&
            Number.isFinite(a.latitude) &&
            Number.isFinite(a.longitude),
        )
        .map((a) => ({
          stopId: a.stopId,
          routeId: a.routeId,
          producerId: a.producerId,
          sequence: a.sequence,
          mode: a.mode,
          volume: a.volume,
          latitude: a.latitude as number,
          longitude: a.longitude as number,
          hubId: a.hubId ?? undefined,
        })),
    [assignments],
  );

  const hubToStopEdges = useMemo(
    () =>
      stops
        .filter((s) => s.mode === "VIA_HUB" && s.hubId && hubById.has(s.hubId))
        .map((s) => {
          const hub = hubById.get(s.hubId as string)!;
          return {
            stopId: s.stopId,
            hubId: s.hubId as string,
            from: [hub.latitude, hub.longitude] as [number, number],
            to: [s.latitude, s.longitude] as [number, number],
            volume: s.volume,
            sequence: s.sequence,
            routeId: s.routeId,
            producerId: s.producerId,
          };
        }),
    [hubById, stops],
  );

  const mapCenter = useMemo<[number, number]>(() => {
    const points: Array<[number, number]> = [
      ...hubs.map((h) => [h.latitude, h.longitude] as [number, number]),
      ...stops.map((s) => [s.latitude, s.longitude] as [number, number]),
    ];
    if (points.length === 0) {
      return [50.85, 4.35];
    }
    const avgLat = points.reduce((sum, p) => sum + p[0], 0) / points.length;
    const avgLng = points.reduce((sum, p) => sum + p[1], 0) / points.length;
    return [avgLat, avgLng];
  }, [hubs, stops]);

  if (hubs.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-gray-300 bg-white px-4 py-6 text-sm text-catl-text">
        Aucune coordonnée de hub disponible pour afficher la carte.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
      <div className="px-3 py-2 text-xs text-catl-text border-b border-gray-100">
        Orange: hubs, bleu: producteur -&gt; hub, violet: hub -&gt; stop final.
      </div>
      <MapContainer center={mapCenter} zoom={8} className="h-[480px] w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {hubs.map((hub) => (
          <CircleMarker
            key={hub.hubId}
            center={[hub.latitude, hub.longitude]}
            radius={10}
            pathOptions={{ color: "#f97316", fillColor: "#fb923c", fillOpacity: 0.7, weight: 2 }}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-bold">Hub {shortId(hub.hubId)}</div>
                <div>Volume: {NUM.format(hub.totalVolume)} u</div>
                <div>Arrets: {hub.stopIds.length}</div>
                <div>Producteurs: {hub.contributingProducers.length}</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {producers.map((producer) => (
          <CircleMarker
            key={producer.producerId}
            center={[producer.latitude, producer.longitude]}
            radius={7}
            pathOptions={{ color: "#2563eb", fillColor: "#60a5fa", fillOpacity: 0.75, weight: 2 }}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-bold">Producteur {shortId(producer.producerId)}</div>
                <div>Flux actifs: {producer.transferCount}</div>
                <div>Volume total: {NUM.format(producer.totalVolume)} u</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {edges.map((edge, index) => {
          const weight = Math.max(2, Math.min(8, 2 + edge.totalVolume / 40));
          return (
            <Polyline
              key={`${edge.producerId}-${edge.hubId}-${index}`}
              positions={[edge.from, edge.to]}
              pathOptions={{ color: "#0ea5e9", weight, opacity: 0.75 }}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-bold">
                    {shortId(edge.producerId)} -&gt; {shortId(edge.hubId)}
                  </div>
                  <div>Volume: {NUM.format(edge.totalVolume)} u</div>
                  <div>Arrets: {edge.stopCount}</div>
                  <div>Detour: {NUM.format(edge.detourKm)} km</div>
                  <div>Cout detour: {EUR.format(edge.detourCostEur)}</div>
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {stops.map((stop) => (
          <CircleMarker
            key={stop.stopId}
            center={[stop.latitude, stop.longitude]}
            radius={5}
            pathOptions={{ color: "#7c3aed", fillColor: "#a78bfa", fillOpacity: 0.8, weight: 2 }}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-bold">Stop {shortId(stop.stopId)}</div>
                <div>Route: {shortId(stop.routeId)} (#{stop.sequence})</div>
                <div>Producteur: {shortId(stop.producerId)}</div>
                <div>Mode: {stop.mode === "VIA_HUB" ? "Via hub" : "Direct"}</div>
                <div>Volume: {NUM.format(stop.volume)} u</div>
                <div>Hub: {stop.hubId ? shortId(stop.hubId) : "-"}</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {hubToStopEdges.map((edge) => {
          const weight = Math.max(1, Math.min(5, 1 + edge.volume / 60));
          return (
            <Polyline
              key={`${edge.hubId}-${edge.stopId}`}
              positions={[edge.from, edge.to]}
              pathOptions={{ color: "#8b5cf6", weight, opacity: 0.8, dashArray: "4 4" }}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-bold">
                    {shortId(edge.hubId)} -&gt; stop {shortId(edge.stopId)}
                  </div>
                  <div>Route: {shortId(edge.routeId)} (#{edge.sequence})</div>
                  <div>Producteur: {shortId(edge.producerId)}</div>
                  <div>Volume: {NUM.format(edge.volume)} u</div>
                </div>
              </Popup>
            </Polyline>
          );
        })}
      </MapContainer>
    </div>
  );
}
