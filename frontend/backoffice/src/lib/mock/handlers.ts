import type {
  Product,
  ReceptionRequest,
  ReceptionResponse,
  StockItem,
  StockItemStatus,
  StorageLocation,
  StorageZone,
  StorageZoneType,
} from "@/lib/types";
import { mockStore, uid } from "./store";

export type MockHandler = (
  match: RegExpMatchArray,
  body: unknown,
  url: URL,
) => MockHandlerResult | Promise<MockHandlerResult>;

export type MockHandlerResult = {
  status: number;
  body?: unknown;
};

type Route = {
  method: string;
  pattern: RegExp;
  handler: MockHandler;
};

function withCount(
  zone: StorageZone,
  locations: StorageLocation[],
): StorageZone {
  return {
    ...zone,
    locationsCount: locations.filter((l) => l.zoneId === zone.id).length,
  };
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

const routes: Route[] = [
  // Zones list
  {
    method: "GET",
    pattern: /^\/api\/v1\/storage-zones\/?$/,
    handler: () => {
      const data = mockStore.getData();
      return {
        status: 200,
        body: data.zones.map((z) => withCount(z, data.locations)),
      };
    },
  },
  // Create zone
  {
    method: "POST",
    pattern: /^\/api\/v1\/storage-zones\/?$/,
    handler: (_m, body) => {
      const z = body as Omit<StorageZone, "id" | "locationsCount">;
      const created: StorageZone = { ...z, id: uid() };
      mockStore.setData((d) => {
        d.zones.push(created);
      });
      return { status: 201, body: { ...created, locationsCount: 0 } };
    },
  },
  // Get zone
  {
    method: "GET",
    pattern: /^\/api\/v1\/storage-zones\/([^/]+)\/?$/,
    handler: (m) => {
      const id = m[1];
      const data = mockStore.getData();
      const zone = data.zones.find((z) => z.id === id);
      if (!zone) return { status: 404, body: { message: "Zone introuvable" } };
      return { status: 200, body: withCount(zone, data.locations) };
    },
  },
  // Patch zone
  {
    method: "PATCH",
    pattern: /^\/api\/v1\/storage-zones\/([^/]+)\/?$/,
    handler: (m, body) => {
      const id = m[1];
      const patch = body as Partial<StorageZone>;
      let updated: StorageZone | null = null;
      mockStore.setData((d) => {
        const idx = d.zones.findIndex((z) => z.id === id);
        if (idx >= 0) {
          d.zones[idx] = { ...d.zones[idx], ...patch, id: d.zones[idx].id };
          updated = d.zones[idx];
        }
      });
      if (!updated) return { status: 404, body: { message: "Zone introuvable" } };
      const data = mockStore.getData();
      return { status: 200, body: withCount(updated, data.locations) };
    },
  },
  // Delete zone (refus si emplacements)
  {
    method: "DELETE",
    pattern: /^\/api\/v1\/storage-zones\/([^/]+)\/?$/,
    handler: (m) => {
      const id = m[1];
      const data = mockStore.getData();
      const hasLocations = data.locations.some((l) => l.zoneId === id);
      if (hasLocations) {
        return {
          status: 409,
          body: {
            message:
              "Impossible de supprimer cette zone : des emplacements y sont rattachés.",
          },
        };
      }
      mockStore.setData((d) => {
        d.zones = d.zones.filter((z) => z.id !== id);
      });
      return { status: 204 };
    },
  },
  // Locations d'une zone
  {
    method: "GET",
    pattern: /^\/api\/v1\/storage-zones\/([^/]+)\/locations\/?$/,
    handler: (m) => {
      const zoneId = m[1];
      const data = mockStore.getData();
      return {
        status: 200,
        body: data.locations.filter((l) => l.zoneId === zoneId),
      };
    },
  },
  // Create location in zone
  {
    method: "POST",
    pattern: /^\/api\/v1\/storage-zones\/([^/]+)\/locations\/?$/,
    handler: (m, body) => {
      const zoneId = m[1];
      const data = mockStore.getData();
      if (!data.zones.find((z) => z.id === zoneId)) {
        return { status: 404, body: { message: "Zone introuvable" } };
      }
      const input = body as Omit<StorageLocation, "id" | "zoneId">;
      const created: StorageLocation = { ...input, id: uid(), zoneId };
      mockStore.setData((d) => {
        d.locations.push(created);
      });
      return { status: 201, body: created };
    },
  },
  // Patch location
  {
    method: "PATCH",
    pattern: /^\/api\/v1\/storage-locations\/([^/]+)\/?$/,
    handler: (m, body) => {
      const id = m[1];
      const patch = body as Partial<StorageLocation>;
      let updated: StorageLocation | null = null;
      mockStore.setData((d) => {
        const idx = d.locations.findIndex((l) => l.id === id);
        if (idx >= 0) {
          d.locations[idx] = {
            ...d.locations[idx],
            ...patch,
            id: d.locations[idx].id,
            zoneId: d.locations[idx].zoneId,
          };
          updated = d.locations[idx];
        }
      });
      if (!updated)
        return { status: 404, body: { message: "Emplacement introuvable" } };
      return { status: 200, body: updated };
    },
  },
  // Delete location
  {
    method: "DELETE",
    pattern: /^\/api\/v1\/storage-locations\/([^/]+)\/?$/,
    handler: (m) => {
      const id = m[1];
      let removed = false;
      mockStore.setData((d) => {
        const before = d.locations.length;
        d.locations = d.locations.filter((l) => l.id !== id);
        removed = d.locations.length < before;
      });
      if (!removed)
        return { status: 404, body: { message: "Emplacement introuvable" } };
      return { status: 204 };
    },
  },
  // Locations disponibles par type de stockage (via les zones du bon type)
  {
    method: "GET",
    pattern: /^\/api\/v1\/storage-locations\/available\/?$/,
    handler: (_m, _body, url) => {
      const storageType = url.searchParams.get("storageType") as
        | StorageZoneType
        | null;
      const data = mockStore.getData();
      const matchingZones = storageType
        ? data.zones.filter((z) => z.type === storageType)
        : data.zones;
      const zoneIds = new Set(matchingZones.map((z) => z.id));
      // exclude locations déjà occupées par un stock_item actif
      const occupied = new Set(
        data.stockItems
          .filter(
            (si) => si.locationId && si.status === "in_stock",
          )
          .map((si) => si.locationId as string),
      );
      const available = data.locations.filter(
        (l) => zoneIds.has(l.zoneId) && !occupied.has(l.id),
      );
      return { status: 200, body: available };
    },
  },
  // Producers
  {
    method: "GET",
    pattern: /^\/api\/v1\/producers\/?$/,
    handler: () => {
      const data = mockStore.getData();
      return { status: 200, body: data.producers };
    },
  },
  // Product lookup par EAN
  {
    method: "GET",
    pattern: /^\/api\/v1\/products\/by-ean\/([^/]+)\/?$/,
    handler: (m) => {
      const ean = decodeURIComponent(m[1]);
      const data = mockStore.getData();
      const product = data.products.find((p) => p.ean === ean);
      if (!product)
        return { status: 404, body: { message: "Produit introuvable" } };
      return { status: 200, body: product };
    },
  },
  // Create product (création minimale à la réception)
  {
    method: "POST",
    pattern: /^\/api\/v1\/products\/?$/,
    handler: (_m, body) => {
      const p = body as Omit<Product, "id">;
      if (!p.producerId) {
        return {
          status: 400,
          body: { message: "Producer requis pour créer un produit." },
        };
      }
      const data = mockStore.getData();
      if (!data.producers.find((x) => x.id === p.producerId)) {
        return { status: 400, body: { message: "Producer inconnu." } };
      }
      const created: Product = { ...p, id: uid() };
      mockStore.setData((d) => {
        d.products.push(created);
      });
      return { status: 201, body: created };
    },
  },
  // Reception → crée un stock_item + retourne { id, status, location }
  {
    method: "POST",
    pattern: /^\/api\/v1\/reception\/?$/,
    handler: (_m, body) => {
      const req = body as ReceptionRequest;
      const data = mockStore.getData();

      if (!req.productId) {
        return {
          status: 400,
          body: { message: "productId requis à la réception." },
        };
      }
      const product = data.products.find((p) => p.id === req.productId);
      if (!product) {
        return {
          status: 400,
          body: { message: "Produit introuvable." },
        };
      }

      let status: StockItemStatus;
      let locationId: string | null = null;
      if (!req.qualityOk) {
        status = "destroyed";
      } else if (req.routing === "xdock") {
        status = "xdock";
      } else {
        status = "in_stock";
        if (!req.locationId) {
          return {
            status: 400,
            body: {
              message:
                "Emplacement requis pour un routage en stock après contrôle qualité OK.",
            },
          };
        }
        const loc = data.locations.find((l) => l.id === req.locationId);
        if (!loc) {
          return { status: 400, body: { message: "Emplacement inconnu." } };
        }
        locationId = loc.id;
      }

      const stockItem: StockItem = {
        id: uid(),
        productId: product.id,
        locationId,
        cooperativeId: data.cooperativeId,
        lotNumber: req.lotNumber ?? null,
        quantity: req.quantity,
        unit: req.unit,
        weightDecl: req.weightDecl ?? null,
        weightAct: req.weightAct ?? null,
        receptionDate: isoToday(),
        expirationDate: req.expirationDate ?? null,
        bestBefore: req.bestBefore ?? null,
        status,
        statusReason: req.statusReason ?? null,
        receptionTemp: req.receptionTemp ?? null,
      };

      mockStore.setData((d) => {
        d.stockItems.push(stockItem);
      });

      const location =
        stockItem.locationId != null
          ? data.locations.find((l) => l.id === stockItem.locationId) ?? null
          : null;

      const response: ReceptionResponse = {
        stockItemId: stockItem.id,
        status: stockItem.status,
        location,
      };
      return { status: 201, body: response };
    },
  },
];

export async function dispatchMock(
  url: URL,
  init?: RequestInit,
): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const path = url.pathname;
  const route = routes.find(
    (r) => r.method === method && r.pattern.test(path),
  );
  if (!route) {
    return new Response(
      JSON.stringify({ message: `Route mock non gérée: ${method} ${path}` }),
      { status: 501, headers: { "Content-Type": "application/json" } },
    );
  }
  const match = path.match(route.pattern)!;
  let body: unknown = undefined;
  if (init?.body) {
    try {
      body = JSON.parse(init.body as string);
    } catch {
      // ignore
    }
  }
  // Petite latence pour rendre le ressenti réaliste
  await new Promise((r) => setTimeout(r, 80));
  const result = await route.handler(match, body, url);
  if (result.status === 204 || result.body === undefined) {
    return new Response(null, { status: result.status });
  }
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { "Content-Type": "application/json" },
  });
}
