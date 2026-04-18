import type { Middleware } from "openapi-fetch";
import type { components } from "@/lib/apigen/types";

type GeocodeResult = components["schemas"]["GeocodeResult"];
type RoutingRequest = components["schemas"]["RoutingRequest"];
type RoutingResult = components["schemas"]["RoutingResult"];

const GEOCODE_PATH = /\/geo\/geocode\/?$/;
const ROUTE_PATH = /\/geo\/route\/?$/;

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OSRM = "https://router.project-osrm.org/route/v1/driving";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function doGeocode(query: string): Promise<GeocodeResult[]> {
  const url = new URL(NOMINATIM);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "0");
  const res = await fetch(url, {
    headers: {
      // Nominatim exige un User-Agent mais les navigateurs ne l'autorisent
      // pas. Leur politique accepte les origins web "responsibly used".
      "Accept-Language": "fr,fr-BE,en",
    },
  });
  if (!res.ok) return [];
  type NominatimItem = {
    display_name: string;
    lat: string;
    lon: string;
    importance?: number;
  };
  const raw = (await res.json()) as NominatimItem[];
  return raw.map((it) => ({
    displayName: it.display_name,
    latitude: Number(it.lat),
    longitude: Number(it.lon),
    confidence:
      typeof it.importance === "number" ? Number(it.importance) : null,
  }));
}

async function doRoute(
  req: RoutingRequest,
): Promise<RoutingResult> {
  if (!req.waypoints || req.waypoints.length < 2) {
    return { distanceKm: 0, durationMin: 0, legs: [] };
  }
  const coords = req.waypoints
    .map((w) => `${w.longitude},${w.latitude}`)
    .join(";");
  const url = new URL(`${OSRM}/${coords}`);
  url.searchParams.set("overview", req.returnGeometry ? "full" : "false");
  url.searchParams.set("geometries", "polyline");
  url.searchParams.set("annotations", "false");
  const res = await fetch(url);
  if (!res.ok) {
    return { distanceKm: 0, durationMin: 0, legs: [] };
  }
  type OsrmLeg = { distance: number; duration: number };
  type OsrmResponse = {
    routes: {
      distance: number;
      duration: number;
      geometry?: string;
      legs: OsrmLeg[];
    }[];
  };
  const data = (await res.json()) as OsrmResponse;
  const r = data.routes?.[0];
  if (!r) return { distanceKm: 0, durationMin: 0, legs: [] };
  return {
    distanceKm: r.distance / 1000,
    durationMin: Math.round(r.duration / 60),
    legs: r.legs.map((l) => ({
      distanceKm: l.distance / 1000,
      durationMin: Math.round(l.duration / 60),
    })),
    geometry: req.returnGeometry ? r.geometry : undefined,
  };
}

/**
 * Middleware qui intercepte `/geo/*` (tour-api renvoie 501) et fait les
 * appels directement chez Nominatim / OSRM.
 * À retirer quand le back wire les providers officiellement.
 */
export const geoMock: Middleware = {
  async onRequest({ request }) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (GEOCODE_PATH.test(path) && request.method === "POST") {
      try {
        const body = (await request.clone().json()) as { query: string };
        const results = await doGeocode(body.query);
        return json(results, 200);
      } catch (err) {
        return json(
          {
            code: "GEOCODE_FAILED",
            message: err instanceof Error ? err.message : "Geocoding failed",
          },
          502,
        );
      }
    }

    if (ROUTE_PATH.test(path) && request.method === "POST") {
      try {
        const body = (await request.clone().json()) as RoutingRequest;
        const result = await doRoute(body);
        return json(result, 200);
      } catch (err) {
        return json(
          {
            code: "ROUTING_FAILED",
            message: err instanceof Error ? err.message : "Routing failed",
          },
          502,
        );
      }
    }

    return undefined;
  },
};
