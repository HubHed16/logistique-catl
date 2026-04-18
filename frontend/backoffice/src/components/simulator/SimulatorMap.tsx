"use client";

import L, { type LeafletMouseEvent } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
} from "@/lib/simulator/constants";
import type { DepotFormInput } from "@/lib/simulator/schemas";

// Fix icônes Leaflet (Next/webpack ne trouve pas le chemin par défaut).
type IconPrototypeWithGetUrl = L.Icon.Default & { _getIconUrl?: unknown };
delete (L.Icon.Default.prototype as IconPrototypeWithGetUrl)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type Props = {
  pickMode: boolean;
  onPicked: () => void;
};

export function SimulatorMap({ pickMode, onPicked }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const depotMarkerRef = useRef<L.Marker | null>(null);

  const { setValue, control } = useFormContext<DepotFormInput>();
  const lat = useWatch({ control, name: "lat" });
  const lon = useWatch({ control, name: "lon" });

  // Init carte une seule fois
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView(
      DEFAULT_MAP_CENTER,
      DEFAULT_MAP_ZOOM,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      depotMarkerRef.current = null;
    };
  }, []);

  // Synchronise le marqueur avec le dépôt
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const nLat = typeof lat === "number" ? lat : null;
    const nLon = typeof lon === "number" ? lon : null;
    if (nLat == null || nLon == null) {
      if (depotMarkerRef.current) {
        depotMarkerRef.current.remove();
        depotMarkerRef.current = null;
      }
      return;
    }
    if (depotMarkerRef.current) {
      depotMarkerRef.current.setLatLng([nLat, nLon]);
    } else {
      depotMarkerRef.current = L.marker([nLat, nLon], {
        title: "Dépôt",
      }).addTo(map);
    }
    map.setView([nLat, nLon], Math.max(map.getZoom(), 12));
  }, [lat, lon]);

  // Clic en mode pick → setValue lat/lon
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onClick = (e: LeafletMouseEvent) => {
      if (!pickMode) return;
      setValue("lat", e.latlng.lat, { shouldValidate: true });
      setValue("lon", e.latlng.lng, { shouldValidate: true });
      onPicked();
    };
    map.on("click", onClick);
    const el = map.getContainer();
    el.style.cursor = pickMode ? "crosshair" : "";
    return () => {
      map.off("click", onClick);
      el.style.cursor = "";
    };
  }, [pickMode, setValue, onPicked]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[500px] rounded-md border border-gray-200 overflow-hidden"
      aria-label="Carte du simulateur"
    />
  );
}
