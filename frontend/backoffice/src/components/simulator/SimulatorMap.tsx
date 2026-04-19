"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import {
  useComputeRoute,
  useProducer,
  useProducerCoords,
  useRoute,
  useRouteLockStatus,
} from "@/lib/simulator/api-hooks";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  STOP_OPERATION_LABELS,
  type ApiStop,
} from "@/lib/simulator/types";
import { useSimulator } from "@/lib/simulator/state";

// Fix icônes Leaflet (Next/webpack ne trouve pas le chemin par défaut)
type IconPrototypeWithGetUrl = L.Icon.Default & { _getIconUrl?: unknown };
delete (L.Icon.Default.prototype as IconPrototypeWithGetUrl)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function buildStopIcon(sequence: number): L.DivIcon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 36" width="30" height="36" aria-hidden="true">
      <defs>
        <filter id="catl-stop-shadow" x="-30%" y="-20%" width="160%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1" />
          <feOffset dx="0" dy="1" result="offset" />
          <feComponentTransfer><feFuncA type="linear" slope="0.35"/></feComponentTransfer>
          <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <g filter="url(#catl-stop-shadow)">
        <path fill="#2c3e50" stroke="#1b2a38" stroke-width="1.2"
          d="M15 1.5c-6.9 0-12.5 5.4-12.5 12.1 0 8.5 11.2 21.2 11.7 21.8a1 1 0 0 0 1.6 0C16.3 34.8 27.5 22.1 27.5 13.6 27.5 6.9 21.9 1.5 15 1.5z"/>
        <circle cx="15" cy="13.5" r="8" fill="white"/>
        <text x="15" y="17" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
          font-size="11" font-weight="700" fill="#2c3e50">${sequence}</text>
      </g>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "catl-stop-marker",
    iconSize: [30, 36],
    iconAnchor: [15, 34],
    popupAnchor: [0, -30],
  });
}

function buildDepotIcon(): L.DivIcon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 48" width="36" height="48" aria-hidden="true">
      <defs>
        <filter id="catl-shadow" x="-30%" y="-20%" width="160%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" />
          <feOffset dx="0" dy="1.2" result="offset" />
          <feComponentTransfer><feFuncA type="linear" slope="0.4"/></feComponentTransfer>
          <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <g filter="url(#catl-shadow)">
        <path fill="#e67e22" stroke="#b06617" stroke-width="1.5"
          d="M18 2c-8.3 0-15 6.6-15 14.8 0 10.5 13.6 27.4 14.2 28.1a1 1 0 0 0 1.6 0C19.4 44.2 33 27.3 33 16.8 33 8.6 26.3 2 18 2z"/>
        <circle cx="18" cy="16.5" r="6" fill="white"/>
        <path fill="#2c3e50" d="M14.5 15v4h2v-2h3v2h2v-4L18 12z"/>
      </g>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "catl-depot-marker",
    iconSize: [36, 48],
    iconAnchor: [18, 46],
    popupAnchor: [0, -40],
  });
}

function addRecenterControl(
  map: L.Map,
  getTarget: () => L.LatLng | null,
): L.Control {
  const Ctrl = L.Control.extend({
    options: { position: "topright" as const },
    onAdd() {
      const btn = L.DomUtil.create("button", "catl-map-btn");
      btn.type = "button";
      btn.setAttribute("aria-label", "Recentrer sur le dépôt");
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9"/><line x1="12" y1="3" x2="12" y2="6"/>
          <line x1="12" y1="18" x2="12" y2="21"/><line x1="3" y1="12" x2="6" y2="12"/>
          <line x1="18" y1="12" x2="21" y2="12"/><circle cx="12" cy="12" r="3"/>
        </svg>`;
      L.DomEvent.disableClickPropagation(btn);
      btn.addEventListener("click", () => {
        const ll = getTarget();
        if (ll) map.flyTo(ll, Math.max(map.getZoom(), 13), { duration: 0.6 });
      });
      return btn;
    },
  });
  const c = new Ctrl();
  c.addTo(map);
  return c;
}

type AddStopControl = L.Control & {
  setActive: (active: boolean) => void;
  setEnabled: (enabled: boolean) => void;
};

function addAddStopControl(map: L.Map, onToggle: () => void): AddStopControl {
  // Le bouton reflète 3 états : désactivé (pas de route éditable), actif
  // (mode clic enclenché), inactif (hover discret). L.DomEvent.disableClickPropagation
  // évite que ce clic déclenche aussi map.on('click').
  let btnRef: HTMLButtonElement | null = null;
  let active = false;
  let enabled = true;

  const render = () => {
    if (!btnRef) return;
    btnRef.setAttribute("data-active", active ? "true" : "false");
    btnRef.disabled = !enabled;
    btnRef.setAttribute(
      "aria-label",
      active
        ? "Désactiver l'ajout par clic"
        : enabled
          ? "Ajouter un arrêt en cliquant sur la carte"
          : "Sélectionne d'abord un trajet éditable",
    );
    btnRef.title = btnRef.getAttribute("aria-label") ?? "";
  };

  const Ctrl = L.Control.extend({
    options: { position: "topright" as const },
    onAdd() {
      const btn = L.DomUtil.create("button", "catl-map-btn");
      btn.type = "button";
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0z"/>
          <line x1="12" y1="7" x2="12" y2="13"/><line x1="9" y1="10" x2="15" y2="10"/>
        </svg>`;
      L.DomEvent.disableClickPropagation(btn);
      btn.addEventListener("click", () => {
        if (!enabled) return;
        onToggle();
      });
      btnRef = btn;
      render();
      return btn;
    },
  });
  const base = new Ctrl();
  base.addTo(map);
  const c = base as unknown as AddStopControl;
  c.setActive = (a: boolean) => {
    active = a;
    render();
  };
  c.setEnabled = (e: boolean) => {
    enabled = e;
    render();
  };
  return c;
}

function buildPreviewIcon(): L.DivIcon {
  // Marqueur d'aperçu — pin creux, couleur accent, atténué ; signale un
  // arrêt en cours d'édition tant que le formulaire n'est pas validé.
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 36" width="30" height="36" aria-hidden="true" style="opacity:0.7">
      <path fill="#e67e22" stroke="#b06617" stroke-width="1.5" stroke-dasharray="2 2"
        d="M15 1.5c-6.9 0-12.5 5.4-12.5 12.1 0 8.5 11.2 21.2 11.7 21.8a1 1 0 0 0 1.6 0C16.3 34.8 27.5 22.1 27.5 13.6 27.5 6.9 21.9 1.5 15 1.5z"/>
      <circle cx="15" cy="13.5" r="7" fill="white" stroke="#e67e22" stroke-width="1.5"/>
      <line x1="15" y1="10" x2="15" y2="17" stroke="#e67e22" stroke-width="2" stroke-linecap="round"/>
      <line x1="11.5" y1="13.5" x2="18.5" y2="13.5" stroke="#e67e22" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "catl-preview-marker",
    iconSize: [30, 36],
    iconAnchor: [15, 34],
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Décode une polyline Google-encodée (précision 5) en liste de [lat, lon].
// Algorithme standard — voir developers.google.com/maps/documentation/utilities/polylinealgorithm.
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
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
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

export function SimulatorMap() {
  const { state, dispatch } = useSimulator();
  const { data: producer } = useProducer(state.currentProducerId);
  const { data: activeRoute } = useRoute(state.activeRouteId);
  const { isLocked } = useRouteLockStatus(state.activeRouteId);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const depotMarkerRef = useRef<L.Marker | null>(null);
  const stopsLayerRef = useRef<L.LayerGroup | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const prevRouteIdRef = useRef<string | null>(null);
  const addStopControlRef = useRef<AddStopControl | null>(null);
  const previewMarkerRef = useRef<L.Marker | null>(null);

  const [addingMode, setAddingMode] = useState(false);
  // Ref "miroir" de addingMode pour accès synchrone depuis les handlers
  // Leaflet (closures capturées une seule fois dans le useEffect d'init).
  const addingModeRef = useRef(false);
  const canAddRef = useRef(false);

  // Init carte
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      },
    ).addTo(map);

    addRecenterControl(map, () => {
      const m = depotMarkerRef.current;
      return m ? m.getLatLng() : null;
    });

    // Toggle mode ajout-par-clic. Le handler lit les refs pour éviter de
    // recréer tout le useEffect d'init quand l'état change.
    const toggleAddingMode = () => {
      if (!canAddRef.current) return;
      const next = !addingModeRef.current;
      addingModeRef.current = next;
      setAddingMode(next);
      if (next) map.closePopup();
    };
    addStopControlRef.current = addAddStopControl(map, toggleAddingMode);

    const onMapClick = (e: L.LeafletMouseEvent) => {
      if (!addingModeRef.current || !canAddRef.current) return;
      const { lat, lng } = e.latlng;
      dispatch({ type: "setPendingStopCoords", coords: { lat, lng } });
      // Mode "one-shot" : un clic capture, puis on sort du mode.
      addingModeRef.current = false;
      setAddingMode(false);
      map.panTo(e.latlng, { animate: true, duration: 0.3 });
    };
    map.on("click", onMapClick);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && addingModeRef.current) {
        addingModeRef.current = false;
        setAddingMode(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);

    mapRef.current = map;
    return () => {
      map.off("click", onMapClick);
      document.removeEventListener("keydown", onKeyDown);
      map.remove();
      mapRef.current = null;
      depotMarkerRef.current = null;
      stopsLayerRef.current = null;
      polylineRef.current = null;
      addStopControlRef.current = null;
      previewMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync l'activation du bouton en fonction du verrouillage / présence de
  // route active. canAddRef est utilisé par les handlers synchrones.
  useEffect(() => {
    const canAdd = !!state.activeRouteId && !isLocked;
    canAddRef.current = canAdd;
    addStopControlRef.current?.setEnabled(canAdd);
    // Si la route devient verrouillée pendant qu'on était en mode ajout,
    // on sort proprement.
    if (!canAdd && addingModeRef.current) {
      addingModeRef.current = false;
      setAddingMode(false);
    }
  }, [state.activeRouteId, isLocked]);

  // Reflète addingMode sur le bouton toggle + classe CSS (curseur crosshair).
  useEffect(() => {
    addStopControlRef.current?.setActive(addingMode);
  }, [addingMode]);

  // Marqueur d'aperçu : suit state.pendingStopCoords. Ajouté tant qu'on
  // attend la saisie du formulaire, retiré dès que les coords sont reset.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const coords = state.pendingStopCoords;
    if (!coords) {
      if (previewMarkerRef.current) {
        previewMarkerRef.current.remove();
        previewMarkerRef.current = null;
      }
      return;
    }
    if (previewMarkerRef.current) {
      previewMarkerRef.current.setLatLng([coords.lat, coords.lng]);
    } else {
      previewMarkerRef.current = L.marker([coords.lat, coords.lng], {
        icon: buildPreviewIcon(),
        interactive: false,
        keyboard: false,
      }).addTo(map);
    }
  }, [state.pendingStopCoords]);

  // Sync marqueur avec producer — la DTO wms n'a plus lat/lon, on géocode
  // l'adresse à la volée (cache 1h via React Query).
  // const coords = useProducerCoords(producer?.address);
  //const lat = coords?.lat ?? null;
  const lat = producer?.latitude
  //const lon = coords?.lon ?? null;
  const lon = producer?.longitude
  const hasActiveRoute = !!state.activeRouteId;
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (lat == null || lon == null) {
      if (depotMarkerRef.current) {
        depotMarkerRef.current.remove();
        depotMarkerRef.current = null;
      }
      return;
    }
    if (depotMarkerRef.current) {
      depotMarkerRef.current.setLatLng([lat, lon]);
    } else {
      depotMarkerRef.current = L.marker([lat, lon], {
        icon: buildDepotIcon(),
        title: producer?.name ?? "Dépôt",
        riseOnHover: true,
      }).addTo(map);
    }
    // Ne recentre sur le dépôt que s'il n'y a pas de route active —
    // sinon le fitBounds ci-dessous prend le relais.
    if (!hasActiveRoute) {
      map.flyTo([lat, lon], Math.max(map.getZoom(), 13), { duration: 0.6 });
    }
  }, [lat, lon, producer?.name, hasActiveRoute]);

  // Rend les arrêts + polyline quand une route est active.
  const stops: ApiStop[] = activeRoute?.stops ?? [];
  const stopsSignature = stops
    .map((s) => `${s.id}:${s.sequence}:${s.latitude ?? ""},${s.longitude ?? ""}`)
    .join("|");

  // Construit la liste de waypoints (dépôt → arrêts ordonnés → dépôt) pour
  // demander au back le tracé routier réel via /geo/route.
  const waypoints =
    lat != null && lon != null
      ? [
          { latitude: lat, longitude: lon },
          ...[...stops]
            .sort((a, b) => a.sequence - b.sequence)
            .filter((s) => s.latitude != null && s.longitude != null)
            .map((s) => ({
              latitude: s.latitude as number,
              longitude: s.longitude as number,
            })),
          { latitude: lat, longitude: lon },
        ]
      : [];
  const { data: routing } = useComputeRoute(waypoints, true);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Init layer group à la volée.
    if (!stopsLayerRef.current) {
      stopsLayerRef.current = L.layerGroup().addTo(map);
    }
    stopsLayerRef.current.clearLayers();
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (!activeRoute || stops.length === 0) {
      prevRouteIdRef.current = activeRoute?.id ?? null;
      return;
    }

    const sorted = [...stops].sort((a, b) => a.sequence - b.sequence);
    const latlngs: L.LatLngExpression[] = [];
    if (lat != null && lon != null) latlngs.push([lat, lon]);
    for (const s of sorted) {
      if (s.latitude == null || s.longitude == null) continue;
      latlngs.push([s.latitude, s.longitude]);
      const marker = L.marker([s.latitude, s.longitude], {
        icon: buildStopIcon(s.sequence),
        riseOnHover: true,
      });
      const popup = `
        <div style="font-size:12px">
          <div style="font-weight:700;color:#2c3e50">#${s.sequence} — ${STOP_OPERATION_LABELS[s.operation].replace(/<[^>]*>/g, "")}</div>
          ${s.address ? `<div style="margin-top:2px">${escapeHtml(s.address)}</div>` : ""}
          <div style="margin-top:2px;color:#7f8c8d">${(s.amountEur ?? 0).toFixed(2)} € · ${s.durationMin ?? 0} min</div>
        </div>`;
      marker.bindPopup(popup);
      stopsLayerRef.current.addLayer(marker);
    }
    if (lat != null && lon != null) latlngs.push([lat, lon]);

    // Si le back a renvoyé une géométrie routière, on l'utilise ; sinon
    // fallback sur le segment direct pointillé (temps de chargement ou
    // indisponibilité OSRM).
    const roadLatLngs =
      routing?.geometry && routing.geometry.length > 0
        ? decodePolyline(routing.geometry)
        : null;
    const polylineCoords: L.LatLngExpression[] =
      roadLatLngs && roadLatLngs.length >= 2 ? roadLatLngs : latlngs;

    if (polylineCoords.length >= 2) {
      polylineRef.current = L.polyline(polylineCoords, {
        color: "#e67e22",
        weight: 4,
        opacity: 0.85,
        // Tracé routier plein quand on l'a, pointillé pour le fallback
        // (signale visuellement que c'est une estimation à vol d'oiseau).
        dashArray: roadLatLngs ? undefined : "6 6",
      }).addTo(map);
    }

    // Fit bounds uniquement au changement de route active (évite le jitter).
    if (prevRouteIdRef.current !== activeRoute.id && latlngs.length >= 1) {
      const bounds = L.latLngBounds(latlngs).pad(0.15);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { animate: true, duration: 0.6 });
      }
    }
    prevRouteIdRef.current = activeRoute.id;
  }, [activeRoute, stopsSignature, lat, lon, stops, routing?.geometry]);

  // Invalide size au resize
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !containerRef.current) return;
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className={`relative catl-map-wrapper${addingMode ? " is-adding-stop" : ""}`}
    >
      <div
        ref={containerRef}
        className="w-full h-[540px] md:h-[680px] md:max-h-[calc(100vh-180px)] bg-catl-bg"
        aria-label="Carte du simulateur"
      />
    </div>
  );
}
