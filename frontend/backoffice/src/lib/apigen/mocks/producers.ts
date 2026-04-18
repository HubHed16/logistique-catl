import type { Middleware } from "openapi-fetch";
import type { components } from "@/lib/apigen/types";

type Producer = components["schemas"]["Producer"];
type ProducerCreate = components["schemas"]["ProducerCreate"];
type ProducerUpdate = components["schemas"]["ProducerUpdate"];
type ProducerPage = components["schemas"]["ProducerPage"];

const STORAGE_KEY = "catl.mock-producers.v1";
const LIST_PATH = /\/producers\/?$/;
const ITEM_PATH = /\/producers\/([0-9a-fA-F-]{36})\/?$/;

type ProducerStore = { items: Producer[] };

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function load(): ProducerStore {
  if (typeof window === "undefined") return { items: seed() };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ProducerStore;
  } catch {
    // ignore
  }
  const seeded = { items: seed() };
  save(seeded);
  return seeded;
}

function save(store: ProducerStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore quota
  }
}

function seed(): Producer[] {
  const now = new Date().toISOString();
  return [
    {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Ferme de démo",
      email: "demo@catl.be",
      address: "Rue des Guillemins, 4000 Liège",
      latitude: 50.6326,
      longitude: 5.5797,
      trades: ["Maraîchage", "Fruiticulture"],
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function json(body: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const notFound = () =>
  json({ code: "NOT_FOUND", message: "Producer not found" }, 404);

/**
 * Middleware openapi-fetch qui court-circuite tous les appels `/producers*`
 * et les sert depuis localStorage en respectant le contrat OpenAPI.
 * À retirer dès que le ProducerController réel est en place côté WMS.
 */
export const producersMock: Middleware = {
  async onRequest({ request }) {
    const url = new URL(request.url);
    const path = url.pathname;
    const listMatch = LIST_PATH.test(path);
    const itemMatch = path.match(ITEM_PATH);
    if (!listMatch && !itemMatch) return undefined;

    const store = load();

    if (listMatch && request.method === "GET") {
      const limit = Number(url.searchParams.get("limit") ?? 50);
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const search = url.searchParams.get("search")?.toLowerCase() ?? "";
      const filtered = search
        ? store.items.filter(
            (p) =>
              p.name.toLowerCase().includes(search) ||
              p.email.toLowerCase().includes(search),
          )
        : store.items;
      const page: ProducerPage = {
        total: filtered.length,
        limit,
        offset,
        items: filtered.slice(offset, offset + limit),
      };
      return json(page, 200);
    }

    if (listMatch && request.method === "POST") {
      const body = (await request.clone().json()) as ProducerCreate;
      const now = new Date().toISOString();
      const created: Producer = {
        id: uid(),
        name: body.name,
        email: body.email,
        address: body.address ?? null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        trades: body.trades ?? [],
        createdAt: now,
        updatedAt: now,
      };
      store.items.push(created);
      save(store);
      return json(created, 201);
    }

    if (itemMatch) {
      const id = itemMatch[1];
      const idx = store.items.findIndex((p) => p.id === id);

      if (request.method === "GET") {
        if (idx < 0) return notFound();
        return json(store.items[idx], 200);
      }

      if (request.method === "PUT") {
        if (idx < 0) return notFound();
        const body = (await request.clone().json()) as ProducerUpdate;
        const now = new Date().toISOString();
        const updated: Producer = {
          ...store.items[idx],
          ...body,
          id: store.items[idx].id,
          createdAt: store.items[idx].createdAt,
          updatedAt: now,
          trades: body.trades ?? store.items[idx].trades,
        };
        store.items[idx] = updated;
        save(store);
        return json(updated, 200);
      }

      if (request.method === "DELETE") {
        if (idx < 0) return notFound();
        store.items.splice(idx, 1);
        save(store);
        return new Response(null, { status: 204 });
      }
    }

    return undefined;
  },
};
