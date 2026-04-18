"use client";

import L, { type LeafletMouseEvent } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  ApiError,
  useProducer,
  useUpdateProducer,
} from "@/lib/simulator/api-hooks";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
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

export function SimulatorMap() {
  const { state, dispatch } = useSimulator();
  const { data: producer } = useProducer(state.currentProducerId);
  const updateProducer = useUpdateProducer(state.currentProducerId ?? "");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const depotMarkerRef = useRef<L.Marker | null>(null);

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

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      depotMarkerRef.current = null;
    };
  }, []);

  // Sync marqueur avec producer
  const lat = producer?.latitude ?? null;
  const lon = producer?.longitude ?? null;
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
    map.flyTo([lat, lon], Math.max(map.getZoom(), 13), { duration: 0.6 });
  }, [lat, lon, producer?.name]);

  // Pick mode : clic → PUT producer avec nouvelles coords
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onClick = async (e: LeafletMouseEvent) => {
      if (!state.pickMode || !state.currentProducerId || !producer) return;
      dispatch({ type: "setPickMode", pickMode: false });
      try {
        await updateProducer.mutateAsync({
          name: producer.name,
          email: producer.email,
          address: producer.address ?? undefined,
          latitude: e.latlng.lat,
          longitude: e.latlng.lng,
          trades: producer.trades,
        });
        toast.success("Dépôt replacé.");
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Déplacement impossible");
      }
    };
    map.on("click", onClick);
    const el = map.getContainer();
    el.style.cursor = state.pickMode ? "crosshair" : "";
    return () => {
      map.off("click", onClick);
      el.style.cursor = "";
    };
  }, [state.pickMode, state.currentProducerId, producer, updateProducer, dispatch]);

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
    <div className="relative catl-map-wrapper">
      <div
        ref={containerRef}
        className="w-full h-[540px] md:h-[680px] md:max-h-[calc(100vh-180px)] bg-catl-bg"
        aria-label="Carte du simulateur"
      />
      {state.pickMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] bg-catl-accent text-white text-xs font-bold uppercase tracking-wide px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse pointer-events-none">
          <Crosshair className="w-3.5 h-3.5" />
          Clique sur la carte pour placer le dépôt
        </div>
      )}
    </div>
  );
}
