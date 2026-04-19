"use client";

import "leaflet/dist/leaflet.css";

import { useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
} from "react-leaflet";
import { useProducerDepots, useRoadGeometries } from "@/lib/simulator/api-hooks";
import type {
  OptimizationHubPickingList,
  OptimizationProducerHubTransfer,
  OptimizationStopAssignment,
  OptimizationTour,
} from "@/lib/simulator/types";

// Palette sémantique — un rôle, une couleur. Tout passe par ces constantes
// pour garder légende et carte synchronisées.
const COLOR_PRODUCER = "#16a34a"; // dépôt producteur
const COLOR_HUB = "#ea580c"; // hub coop (transit, non-producteur)
const COLOR_STOP = "#7c3aed"; // point de livraison
const COLOR_LASTMILE = "#0ea5e9"; // tracé livreur (hub → stops)
const COLOR_DIRECT = "#a21caf"; // tournées directes (producteur → livraisons)

const EUR = new Intl.NumberFormat("fr-BE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});
const NUM = new Intl.NumberFormat("fr-BE", { maximumFractionDigits: 2 });

function shortId(id: string) {
  return id.slice(0, 8);
}

// Couleur stable par producerId. Ancre les tracés amont (bulk) à la
// couleur du producteur émetteur, de sorte que plusieurs flux d'un même
// producteur vers des hubs différents restent groupés visuellement.
function producerColor(producerId: string) {
  const hash = Array.from(producerId).reduce(
    (acc, c) => acc + c.charCodeAt(0),
    0,
  );
  const hue = (hash * 47) % 360;
  return `hsl(${hue}, 70%, 40%)`;
}

// Google encoded polyline → [lat, lon][]. OSRM renvoie souvent polyline6,
// mais certains providers renvoient polyline5. On auto-détecte.
function decodePolylineWithPrecision(
  encoded: string,
  precision: 5 | 6,
): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const factor = precision === 6 ? 1e6 : 1e5;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dLat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dLng;

    // Encoded polyline est en (lat, lon).
    points.push([lat / factor, lng / factor]);
  }
  return points;
}

function bbox(points: ReadonlyArray<[number, number]>) {
  let minLat = Infinity,
    maxLat = -Infinity,
    minLon = Infinity,
    maxLon = -Infinity;
  for (const [lat, lon] of points) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  }
  return { minLat, maxLat, minLon, maxLon };
}

function bboxIntersects(a: ReturnType<typeof bbox>, b: ReturnType<typeof bbox>) {
  // bbox lat
  if (a.maxLat < b.minLat || a.minLat > b.maxLat) return false;
  // bbox lon
  if (a.maxLon < b.minLon || a.minLon > b.maxLon) return false;
  return true;
}

function isPlausibleLatLon([lat, lon]: [number, number]) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

function decodePolylineAuto(encoded: string): [number, number][] {
  // On essaie d'abord polyline6 (OSRM), puis polyline5.
  // On valide sur la plausibilité des coords.
  const p6 = decodePolylineWithPrecision(encoded, 6);
  if (p6.length >= 2 && p6.every(isPlausibleLatLon)) return p6;

  const p5 = decodePolylineWithPrecision(encoded, 5);
  if (p5.length >= 2 && p5.every(isPlausibleLatLon)) return p5;

  // Dernier recours: renvoyer le "moins pire" (évite crash/render vide).
  return p6.length >= p5.length ? p6 : p5;
}

type ProducerNode = {
  producerId: string;
  lat: number;
  lon: number;
  source?: "HUB" | "GEOCODE";
  name?: string;
  address?: string;
};

type HubNode = {
  hubId: string;
  lat: number;
  lon: number;
  totalVolume: number;
  stopCount: number;
  contributingProducers: string[];
};

type StopNode = {
  stopId: string;
  routeId: string;
  producerId: string;
  hubId: string | null;
  sequence: number;
  mode: OptimizationStopAssignment["mode"];
  volume: number;
  lat: number;
  lon: number;
};

export function OptimizationMap({
  hubs,
  transfers,
  assignments,
  tours,
}: {
  // `hubs` doit être la liste complète des pickingLists, pas uniquement les hubs utilisés.
  // On y puise des infos de localisation (hubId -> coords) ET les dépôts de producteurs
  // quand un producteur possède une infrastructure/hub.
  hubs: OptimizationHubPickingList[];
  transfers: OptimizationProducerHubTransfer[];
  assignments: OptimizationStopAssignment[];
  tours?: OptimizationTour[];
}) {
  // L’ensemble des producteurs impliqués dans le résultat d’optim (même si
  // leur hub est inactif/absent de `hubs`). Sert à déclencher un fallback.
  const producerIdsInResult = useMemo(() => {
    const set = new Set<string>();
    for (const a of assignments) set.add(a.producerId);
    for (const t of transfers) set.add(t.producerId);
    return Array.from(set);
  }, [assignments, transfers]);

  // Fallback WMS: adresse producteur -> géocodage -> coords (cache React Query).
  // On ne s’en sert que quand `hubs` ne fournit pas de coords.
  const producerDepots = useProducerDepots(producerIdsInResult);

  const producers = useMemo<ProducerNode[]>(() => {
    const m = new Map<string, ProducerNode>();

    for (const id of producerIdsInResult) {
      const depot = producerDepots.get(id);
      if (!depot) continue;
      m.set(id, {
        producerId: id,
        lat: depot.lat,
        lon: depot.lon,
        source: "GEOCODE",
        name: depot.name,
        address: depot.address,
      });
    }

    return Array.from(m.values());
  }, [producerIdsInResult, producerDepots]);
  const producerById = useMemo(
    () => new Map(producers.map((p) => [p.producerId, p])),
    [producers],
  );

  // Hubs (tous) indexés par id — sert à trouver un hub même si son stopIds est vide
  // (ex: bug de filtrage upstream, ou transfert calculé mais aucun stop last-mile).
  const hubByIdAll = useMemo(() => {
    const m = new Map<string, HubNode>();
    for (const h of hubs) {
      m.set(h.hubId, {
        hubId: h.hubId,
        lat: h.latitude,
        lon: h.longitude,
        totalVolume: h.totalVolume,
        stopCount: h.stopIds.length,
        contributingProducers: h.contributingProducers,
      });
    }
    return m;
  }, [hubs]);

  // Hubs actifs = ceux que le solveur a retenus pour faire transiter
  // au moins un arrêt.
  const activeHubs = useMemo<HubNode[]>(
    () => Array.from(hubByIdAll.values()).filter((h) => h.stopCount > 0),
    [hubByIdAll],
  );
  const hubById = useMemo(
    () => new Map(activeHubs.map((h) => [h.hubId, h])),
    [activeHubs],
  );

  // (Désactivé) Anneau "producteur aussi hub": non disponible sans hubProducerId.
  const producerAlsoActiveHub = useMemo(() => new Map<string, HubNode>(), []);

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
          hubId: a.hubId ?? null,
          sequence: a.sequence,
          mode: a.mode,
          volume: a.volume,
          lat: a.latitude as number,
          lon: a.longitude as number,
        })),
    [assignments],
  );

  // Routes producteur → hub : un trajet par transfert non nul. Si le
  // producteur est lui-même propriétaire du hub (dépôt = hub), le trajet
  // est trivial (0 km) et ne mérite pas d'être tracé.
  const producerToHubRoutes = useMemo(() => {
    return transfers
      .filter((t) => t.totalVolume > 0)
      .map((t, i) => {
        const p = producerById.get(t.producerId);
        // Pour p2h, on a besoin des coords du hub même s'il est "inactif" côté stopIds.
        const h = hubByIdAll.get(t.hubId);
        if (!p || !h) return null;
        if (p.lat === h.lat && p.lon === h.lon) return null;
        return {
          routeId: `p2h-${t.producerId}-${t.hubId}-${i}`,
          producerId: t.producerId,
          hubId: t.hubId,
          from: { latitude: p.lat, longitude: p.lon },
          to: { latitude: h.lat, longitude: h.lon },
          totalVolume: t.totalVolume,
          detourKm: t.detourKm,
          detourCostEur: t.detourCostEur,
          stopCount: t.stopIds.length,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
  }, [transfers, producerById, hubByIdAll]);

  // Tournées livreur : on regroupe les arrêts VIA_HUB par (hubId,
  // routeId), trie par séquence, puis part du hub vers le dernier arrêt.
  const lastMileRoutes = useMemo(() => {
    type R = {
      key: string;
      hubId: string;
      routeId: string;
      hub: HubNode;
      stops: StopNode[];
    };
    const byKey = new Map<string, R>();
    for (const s of stops) {
      if (s.mode !== "VIA_HUB" || !s.hubId) continue;
      const hub = hubByIdAll.get(s.hubId);
      if (!hub) continue;
      const key = `${s.hubId}|${s.routeId}`;
      let r = byKey.get(key);
      if (!r) {
        r = { key, hubId: s.hubId, routeId: s.routeId, hub, stops: [] };
        byKey.set(key, r);
      }
      r.stops.push(s);
    }
    const out = Array.from(byKey.values());

    // IMPORTANT: l'assignement `sequence` côté back correspond à la tournée WMS
    // d'origine, pas forcément à l'ordre d'une tournée hub consolidée.
    // Pour éviter des segments aberrants (grands triangles), on ordonne
    // localement par proximité.
    for (const r of out) {
      r.stops = orderStopsNearestNeighbor(
        { lat: r.hub.lat, lon: r.hub.lon },
        r.stops,
      );
    }

    return out;
  }, [stops, hubByIdAll]);

  // Tournées directes : regroupe les arrêts DIRECT par (producerId, routeId), triées
  // par sequence, puis on part du dépôt producteur.
  const directRoutes = useMemo(() => {
    type R = {
      key: string;
      producerId: string;
      routeId: string;
      producer: ProducerNode;
      stops: StopNode[];
    };
    const byKey = new Map<string, R>();
    for (const s of stops) {
      if (s.mode !== "DIRECT") continue;
      const producer = producerById.get(s.producerId);
      if (!producer) continue;
      const key = `${s.producerId}|${s.routeId}`;
      let r = byKey.get(key);
      if (!r) {
        r = {
          key,
          producerId: s.producerId,
          routeId: s.routeId,
          producer,
          stops: [],
        };
        byKey.set(key, r);
      }
      r.stops.push(s);
    }
    const out = Array.from(byKey.values());

    for (const r of out) {
      r.stops = orderStopsNearestNeighbor(
        { lat: r.producer.lat, lon: r.producer.lon },
        r.stops,
      );
    }

    return out;
  }, [stops, producerById]);

  const useToursForRouting = (tours?.length ?? 0) > 0;

  // Route inputs pour la récupération de géométrie OSRM.
  // Si `tours` est fourni par le backend, on l'utilise comme source de vérité
  // (legs déjà ordonnés). Sinon, fallback sur les reconstructions locales.
  const roadInputs = useMemo(() => {
    if (useToursForRouting) {
      return tours!
        .filter((t) => (t.legs?.length ?? 0) >= 1)
        .map((t) => {
          const waypoints = [
            { latitude: t.start.latitude, longitude: t.start.longitude },
            ...t.legs.map((l) => ({
              latitude: l.to.latitude,
              longitude: l.to.longitude,
            })),
          ];
          return {
            routeId: `tour-${t.tourId}`,
            waypoints,
          };
        });
    }

    const p2h = producerToHubRoutes.map((r) => ({
      routeId: r.routeId,
      waypoints: [r.from, r.to],
    }));
    const lm = lastMileRoutes.map((r) => {
      const base = [
        { latitude: r.hub.lat, longitude: r.hub.lon },
        ...r.stops.map((s) => ({ latitude: s.lat, longitude: s.lon })),
      ];
      return {
        routeId: `lm-${r.key}`,
        waypoints: closeLoop(base),
      };
    });
    const dr = directRoutes.map((r) => {
      const base = [
        { latitude: r.producer.lat, longitude: r.producer.lon },
        ...r.stops.map((s) => ({ latitude: s.lat, longitude: s.lon })),
      ];
      return {
        routeId: `dr-${r.key}`,
        waypoints: closeLoop(base),
      };
    });
    return [...p2h, ...lm, ...dr];
  }, [tours, useToursForRouting, producerToHubRoutes, lastMileRoutes, directRoutes]);
  const geometries = useRoadGeometries(roadInputs);

  const debugEnabled =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("debug") === "1";

  const debug = useMemo(() => {
    if (!debugEnabled) return null;

    const geoStates = roadInputs.map((r) => {
      const g = geometries.get(r.routeId);
      return {
        routeId: r.routeId,
        wpCount: r.waypoints.length,
        isLoading: !!g?.isLoading,
        hasGeometry: !!(g?.geometry && g.geometry.length > 0),
        geomLen: g?.geometry?.length ?? 0,
        from: r.waypoints[0],
        to: r.waypoints[r.waypoints.length - 1],
      };
    });

    const loading = geoStates.filter((x) => x.isLoading).length;
    const withGeom = geoStates.filter((x) => x.hasGeometry).length;
    const withoutGeom = geoStates.length - withGeom;

    return {
      counts: {
        hubsIn: hubs.length,
        transfersIn: transfers.length,
        assignmentsIn: assignments.length,
        producers: producers.length,
        activeHubs: activeHubs.length,
        stops: stops.length,
        producerToHubRoutes: producerToHubRoutes.length,
        lastMileRoutes: lastMileRoutes.length,
        roadInputs: roadInputs.length,
      },
      geometries: {
        loading,
        withGeom,
        withoutGeom,
      },
      examples: {
        firstRoadInput: roadInputs[0] ?? null,
        firstGeoState: geoStates[0] ?? null,
      },
      geoStates: geoStates.slice(0, 12),
    };
  }, [
    debugEnabled,
    hubs.length,
    transfers.length,
    assignments.length,
    producers.length,
    activeHubs.length,
    stops.length,
    producerToHubRoutes.length,
    lastMileRoutes.length,
    roadInputs,
    geometries,
  ]);

  const mapCenter = useMemo<[number, number]>(() => {
    const pts: Array<[number, number]> = [
      ...producers.map((p) => [p.lat, p.lon] as [number, number]),
      ...Array.from(hubByIdAll.values()).map((h) => [h.lat, h.lon] as [number, number]),
      ...stops.map((s) => [s.lat, s.lon] as [number, number]),
    ];
    if (pts.length === 0) return [50.85, 4.35];
    const avgLat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const avgLng = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    return [avgLat, avgLng];
  }, [producers, activeHubs, stops]);

  if (
    producers.length === 0 &&
    hubByIdAll.size === 0 &&
    stops.length === 0
  ) {
    return (
      <div className="rounded-md border border-dashed border-gray-300 bg-white px-4 py-6 text-sm text-catl-text">
        Aucune coordonnée disponible pour afficher la carte.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
      {debugEnabled && debug && (
        <div className="px-3 py-2 text-[11px] font-mono border-b border-gray-100 bg-yellow-50 text-yellow-900">
          <div className="font-bold">DEBUG OptimizationMap (?debug=1)</div>
          <div className="mt-1 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-0.5">
            <div>hubs(in): {debug.counts.hubsIn}</div>
            <div>transfers(in): {debug.counts.transfersIn}</div>
            <div>assignments(in): {debug.counts.assignmentsIn}</div>
            <div>producers: {debug.counts.producers}</div>
            <div>activeHubs: {debug.counts.activeHubs}</div>
            <div>stops: {debug.counts.stops}</div>
            <div>p2h routes: {debug.counts.producerToHubRoutes}</div>
            <div>lastmile routes: {debug.counts.lastMileRoutes}</div>
            <div>roadInputs: {debug.counts.roadInputs}</div>
            <div>geo loading: {debug.geometries.loading}</div>
            <div>geo withGeom: {debug.geometries.withGeom}</div>
            <div>geo noGeom: {debug.geometries.withoutGeom}</div>
          </div>
          <div className="mt-2">
            <div className="font-bold">1er roadInput</div>
            <pre className="whitespace-pre-wrap break-words">
{JSON.stringify(debug.examples.firstRoadInput, null, 2)}
            </pre>
          </div>
          <div className="mt-2">
            <div className="font-bold">États géométrie (max 12)</div>
            <pre className="whitespace-pre-wrap break-words">
{JSON.stringify(debug.geoStates, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div className="px-3 py-2 text-xs text-catl-text border-b border-gray-100 flex flex-wrap items-center gap-x-4 gap-y-1">
        <LegendDot color={COLOR_PRODUCER} label="Producteur" />
        <LegendDot color={COLOR_HUB} label="Hub coop (actif)" />
        <LegendDot color="#ffffff" ring="#9a3412" label="Hub coop (non retenu)" />
        <LegendDot color={COLOR_STOP} label="Livraison" />
        <LegendLineGradient label="Route producteur → hub (couleur par producteur)" />
        <LegendLine
          color={COLOR_LASTMILE}
          dashed
          label="Route livreur hub → livraison"
        />
        <LegendLine color={COLOR_DIRECT} label="Route directe producteur → livraisons" />
      </div>
      <MapContainer
        center={mapCenter}
        zoom={8}
        className="h-[520px] w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Si le back fournit `tours`, on trace exclusivement à partir de ces tournées
            (source de vérité) pour éviter les reconstructions locales incohérentes. */}
        {useToursForRouting &&
          tours!
            .filter((t) => (t.legs?.length ?? 0) >= 1)
            .map((t) => {
              const id = `tour-${t.tourId}`;
              const g = geometries.get(id);

              const fallbackOpen: [number, number][] = [
                [t.start.latitude, t.start.longitude],
                ...t.legs.map((l) => [l.to.latitude, l.to.longitude] as [number, number]),
              ];
              const fallback: [number, number][] =
                fallbackOpen.length >= 2
                  ? [...fallbackOpen, fallbackOpen[0]]
                  : fallbackOpen;

              const decoded =
                g?.geometry && g.geometry.length > 0
                  ? decodePolylineAuto(g.geometry)
                  : null;

              const looksOkBBox =
                decoded &&
                decoded.length >= 2 &&
                decoded.every(isPlausibleLatLon) &&
                bboxIntersects(bbox(decoded), bbox(fallback));

              const positions: [number, number][] =
                decoded && looksOkBBox ? decoded : fallback;

              // Palette simple : conserve la couleur "direct" pour les boucles,
              // et une variante pour last-mile/bulk. (Le détail visuel peut évoluer.)
              const color =
                t.type === "LAST_MILE"
                  ? COLOR_LASTMILE
                  : t.type === "BULK_TRANSFER"
                    ? producerColor(String(t.producerId ?? ""))
                    : COLOR_DIRECT;

              const weight = Math.max(2, Math.min(7, 2 + (t.totalKm ?? 0) / 20));

              return (
                <Polyline
                  key={id}
                  positions={positions}
                  pathOptions={{
                    color,
                    weight,
                    opacity: 0.85,
                    dashArray: t.type === "LAST_MILE" ? "6 5" : undefined,
                  }}
                >
                  <Popup>
                    <div className="text-xs">
                      <div className="font-bold">Tournée {t.type}</div>
                      <div className="font-mono">{t.tourId}</div>
                      {t.producerId && <div>Producteur : {shortId(t.producerId)}</div>}
                      {t.hubId && <div>Hub : {shortId(t.hubId)}</div>}
                      <div>Distance : {NUM.format(t.totalKm)} km</div>
                      <div>Coût trajet : {EUR.format(t.totalTravelCostEur)}</div>
                      <div>Legs : {t.legs.length}</div>
                    </div>
                  </Popup>
                </Polyline>
              );
            })}

        {/* Fallback legacy (si pas de `tours`): reconstructions locales */}
        {!useToursForRouting && (
          <>
            {/* Amont : producteur → hub (bulk). Couleur = couleur du producteur.
            Épaisseur indexée au volume transféré. */}
            {producerToHubRoutes.map((r) => {
              const g = geometries.get(r.routeId);
              const fallback: [number, number][] = [
                [r.from.latitude, r.from.longitude],
                [r.to.latitude, r.to.longitude],
              ];

              const decoded =
                g?.geometry && g.geometry.length > 0
                  ? decodePolylineAuto(g.geometry)
                  : null;

              const looksOkBBox =
                decoded &&
                decoded.length >= 2 &&
                decoded.every(isPlausibleLatLon) &&
                bboxIntersects(bbox(decoded), bbox(fallback));

              const positions: [number, number][] =
                decoded && looksOkBBox ? decoded : fallback;

              const weight = Math.max(2.5, Math.min(8, 2 + r.totalVolume / 40));
              return (
                <Polyline
                  key={r.routeId}
                  positions={positions}
                  pathOptions={{
                    color: producerColor(r.producerId),
                    weight,
                    opacity: 0.85,
                  }}
                >
                  <Popup>
                    <div className="text-xs">
                      <div className="font-bold">
                        Producteur {shortId(r.producerId)} → hub{" "}
                        {shortId(r.hubId)}
                      </div>
                      <div>Volume : {NUM.format(r.totalVolume)} u</div>
                      <div>Arrêts couverts : {r.stopCount}</div>
                      <div>Détour : {NUM.format(r.detourKm)} km</div>
                      <div>Coût détour : {EUR.format(r.detourCostEur)}</div>
                    </div>
                  </Popup>
                </Polyline>
              );
            })}

            {/* Aval : hub → arrêts (last-mile). Couleur unique bleue + pointillés
            pour distinguer visuellement des trajets amont. */}
            {lastMileRoutes.map((r) => {
              const g = geometries.get(`lm-${r.key}`);
              const fallbackOpen: [number, number][] = [
                [r.hub.lat, r.hub.lon],
                ...r.stops.map((s) => [s.lat, s.lon] as [number, number]),
              ];
              const fallback: [number, number][] =
                fallbackOpen.length >= 2
                  ? [...fallbackOpen, fallbackOpen[0]]
                  : fallbackOpen;

              const decoded =
                g?.geometry && g.geometry.length > 0
                  ? decodePolylineAuto(g.geometry)
                  : null;

              const looksOkBBox =
                decoded &&
                decoded.length >= 2 &&
                decoded.every(isPlausibleLatLon) &&
                bboxIntersects(bbox(decoded), bbox(fallback));

              const positions: [number, number][] =
                decoded && looksOkBBox ? decoded : fallback;

              const volumeSum = r.stops.reduce((a, s) => a + s.volume, 0);
              const weight = Math.max(2, Math.min(6, 2 + volumeSum / 80));
              return (
                <Polyline
                  key={r.key}
                  positions={positions}
                  pathOptions={{
                    color: COLOR_LASTMILE,
                    weight,
                    opacity: 0.85,
                    dashArray: "6 5",
                  }}
                >
                  <Popup>
                    <div className="text-xs">
                      <div className="font-bold">
                        Livreur hub {shortId(r.hubId)} — tournée{" "}
                        {shortId(r.routeId)}
                      </div>
                      <div>Arrêts : {r.stops.length}</div>
                      <div>Volume total : {NUM.format(volumeSum)} u</div>
                    </div>
                  </Popup>
                </Polyline>
              );
            })}

            {/* Tournées directes : producteur → arrêts DIRECT (route réelle OSRM si dispo). */}
            {directRoutes.map((r) => {
              const id = `dr-${r.key}`;
              const g = geometries.get(id);
              const fallbackOpen: [number, number][] = [
                [r.producer.lat, r.producer.lon],
                ...r.stops.map((s) => [s.lat, s.lon] as [number, number]),
              ];
              const fallback: [number, number][] =
                fallbackOpen.length >= 2
                  ? [...fallbackOpen, fallbackOpen[0]]
                  : fallbackOpen;

              const decoded =
                g?.geometry && g.geometry.length > 0
                  ? decodePolylineAuto(g.geometry)
                  : null;

              const looksOkBBox =
                decoded &&
                decoded.length >= 2 &&
                decoded.every(isPlausibleLatLon) &&
                bboxIntersects(bbox(decoded), bbox(fallback));

              const positions: [number, number][] =
                decoded && looksOkBBox ? decoded : fallback;

              const volumeSum = r.stops.reduce((a, s) => a + s.volume, 0);
              const weight = Math.max(2, Math.min(7, 2 + volumeSum / 60));

              return (
                <Polyline
                  key={id}
                  positions={positions}
                  pathOptions={{
                    color: COLOR_DIRECT,
                    weight,
                    opacity: 0.75,
                  }}
                >
                  <Popup>
                    <div className="text-xs">
                      <div className="font-bold">
                        Direct producteur {shortId(r.producerId)} — tournée {shortId(r.routeId)}
                      </div>
                      <div>Arrêts : {r.stops.length}</div>
                      <div>Volume total : {NUM.format(volumeSum)} u</div>
                    </div>
                  </Popup>
                </Polyline>
              );
            })}
          </>
        )}

        {/* Producteurs. Si le dépôt sert aussi de hub actif, on ajoute un
            anneau orange (COLOR_HUB) autour du marqueur vert pour le
            signaler sans doubler le point. */}
        {producers.map((p) => {
          const alsoHub = producerAlsoActiveHub.get(p.producerId);
          const isFallback = p.source === "GEOCODE";
          return (
            <CircleMarker
              key={`prod-${p.producerId}`}
              center={[p.lat, p.lon]}
              radius={alsoHub ? 12 : 10}
              pathOptions={{
                color: alsoHub ? COLOR_HUB : isFallback ? "#14532d" : "#166534",
                fillColor: COLOR_PRODUCER,
                fillOpacity: isFallback ? 0.75 : 0.95,
                weight: alsoHub ? 4 : 2.5,
              }}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-bold">
                    Producteur {shortId(p.producerId)}
                  </div>

                  {p.name && (
                    <div className="mt-0.5 text-catl-text/80">
                      {p.name}
                    </div>
                  )}

                  <div className="font-mono text-[10px] text-catl-text/70 mt-0.5">
                    {NUM.format(p.lat)}, {NUM.format(p.lon)}
                  </div>

                  {isFallback && (
                    <div className="mt-1 text-catl-text/70">
                      Position estimée (géocodage adresse)
                      {p.address ? ` : ${p.address}` : ""}
                    </div>
                  )}

                  {alsoHub && (
                    <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 font-semibold">
                      Dépôt actif comme hub {shortId(alsoHub.hubId)} —{" "}
                      {NUM.format(alsoHub.totalVolume)} u ·{" "}
                      {alsoHub.stopCount} arrêts
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Hubs "coop" : actifs */}
        {activeHubs.map((h) => (
          <CircleMarker
            key={`hub-${h.hubId}`}
            center={[h.lat, h.lon]}
            radius={11}
            pathOptions={{
              color: "#9a3412",
              fillColor: COLOR_HUB,
              fillOpacity: 0.9,
              weight: 2.5,
            }}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-bold">Hub coop {shortId(h.hubId)}</div>
                <div className="font-mono text-[10px] text-catl-text/70 mt-0.5">
                  {NUM.format(h.lat)}, {NUM.format(h.lon)}
                </div>
                <div className="mt-1">Volume : {NUM.format(h.totalVolume)} u</div>
                <div>Arrêts : {h.stopCount}</div>
                <div>Producteurs : {h.contributingProducers.length}</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Hubs "coop" : candidats non retenus par l'optimiseur */}
        {Array.from(hubByIdAll.values())
          .filter((h) => h.stopCount === 0)
          .map((h) => (
            <CircleMarker
              key={`hub-inactive-${h.hubId}`}
              center={[h.lat, h.lon]}
              radius={10}
              pathOptions={{
                color: "#9a3412",
                fillColor: "#ffffff",
                fillOpacity: 0.6,
                weight: 2,
                dashArray: "4 3",
              }}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-bold">Hub coop {shortId(h.hubId)}</div>
                  <div className="font-mono text-[10px] text-catl-text/70 mt-0.5">
                    {NUM.format(h.lat)}, {NUM.format(h.lon)}
                  </div>
                  <div className="mt-1 text-catl-text/60 italic">Non retenu par l&apos;optimiseur</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

        {/* Points de livraison */}
        {stops.map((s) => (
          <CircleMarker
            key={`stop-${s.stopId}`}
            center={[s.lat, s.lon]}
            radius={5}
            pathOptions={{
              color: "#5b21b6",
              fillColor: COLOR_STOP,
              fillOpacity: 0.95,
              weight: 1.5,
            }}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-bold">
                  Livraison #{s.sequence} ({shortId(s.stopId)})
                </div>
                <div>Tournée : {shortId(s.routeId)}</div>
                <div>Producteur : {shortId(s.producerId)}</div>
                <div>
                  Mode : {s.mode === "VIA_HUB" ? "Via hub" : "Direct"}
                </div>
                <div>Hub : {s.hubId ? shortId(s.hubId) : "—"}</div>
                <div>Volume : {NUM.format(s.volume)} u</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

function LegendDot({
  color,
  label,
  ring,
  ringLabel,
}: {
  color: string;
  label: string;
  ring?: string;
  ringLabel?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block w-3 h-3 rounded-full"
        style={{
          background: color,
          boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
        }}
      />
      {label}
      {ringLabel && (
        <span className="text-catl-text/60 ml-1">{ringLabel}</span>
      )}
    </span>
  );
}

function LegendLine({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block w-6 h-[3px]"
        style={{
          background: dashed
            ? `repeating-linear-gradient(to right, ${color} 0 3px, transparent 3px 6px)`
            : color,
        }}
      />
      {label}
    </span>
  );
}

function LegendLineGradient({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block w-6 h-[3px]"
        style={{
          background:
            "linear-gradient(to right, hsl(0,70%,45%), hsl(120,70%,40%), hsl(240,70%,45%))",
        }}
      />
      {label}
    </span>
  );
}

function closeLoop(
  waypoints: ReadonlyArray<{ latitude: number; longitude: number }>,
): ReadonlyArray<{ latitude: number; longitude: number }> {
  if (waypoints.length < 2) return waypoints;
  const first = waypoints[0];
  const last = waypoints[waypoints.length - 1];
  if (first.latitude === last.latitude && first.longitude === last.longitude) {
    return waypoints;
  }
  return [...waypoints, { latitude: first.latitude, longitude: first.longitude }];
}

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sin1 = Math.sin(dLat / 2);
  const sin2 = Math.sin(dLon / 2);
  const h = sin1 * sin1 + Math.cos(lat1) * Math.cos(lat2) * sin2 * sin2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function orderStopsNearestNeighbor(
  start: { lat: number; lon: number },
  stops: ReadonlyArray<StopNode>,
): StopNode[] {
  const remaining = new Map<string, StopNode>();
  for (const s of stops) remaining.set(s.stopId, s);
  const out: StopNode[] = [];
  let current = start;
  while (remaining.size > 0) {
    let best: StopNode | null = null;
    let bestD = Infinity;
    for (const s of remaining.values()) {
      const d = haversineKm(current, { lat: s.lat, lon: s.lon });
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    if (!best) break;
    out.push(best);
    remaining.delete(best.stopId);
    current = { lat: best.lat, lon: best.lon };
  }
  return out;
}
