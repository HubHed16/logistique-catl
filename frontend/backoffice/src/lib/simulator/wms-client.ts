// Raw fetch wrapper pour wms-api — utilisé quand tour-api ne proxie pas
// l'endpoint (actuellement : tout Producer CRUD au-delà de la liste).
// Les chemins sont relatifs à /api/wms (préfixe appliqué par le proxy
// Next — cf. src/app/api/wms/[...path]/route.ts).
//
// La WMS DTO utilise snake_case (is_bio) — on normalise en camelCase
// aux frontières de ce module pour que le reste du front reste cohérent
// avec le schéma OpenAPI de tour (Producer.isBio).

import type { components } from "@/lib/apigen/types";

type Producer = components["schemas"]["Producer"];

// Forme retournée par wms-api (et envoyée en PATCH).
type WmsProducerDto = {
  id?: string | null;
  name: string;
  contact?: string | null;
  address?: string | null;
  province?: string | null;
  is_bio?: boolean;
};

function toProducer(dto: WmsProducerDto): Producer {
  return {
    id: dto.id ?? "",
    name: dto.name,
    contact: dto.contact ?? null,
    address: dto.address ?? null,
    province: dto.province ?? null,
    isBio: dto.is_bio ?? false,
  };
}

function toWmsDto(p: Omit<Producer, "id"> & { id?: string }): WmsProducerDto {
  return {
    id: p.id ?? null,
    name: p.name,
    contact: p.contact ?? null,
    address: p.address ?? null,
    province: p.province ?? null,
    is_bio: p.isBio,
  };
}

export class WmsApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseError(res: Response, fallback: string): Promise<never> {
  let msg = fallback;
  try {
    const body = (await res.json()) as { message?: string };
    if (body?.message) msg = body.message;
  } catch {
    /* ignore */
  }
  throw new WmsApiError(`${msg} (${res.status})`, res.status);
}

export async function wmsListProducers(
  page = 0,
  size = 100,
): Promise<Producer[]> {
  const res = await fetch(`/api/wms/producers?page=${page}&size=${size}`);
  if (res.status === 204) return [];
  if (!res.ok) await parseError(res, "Chargement des producteurs impossible");
  const data = (await res.json()) as WmsProducerDto[];
  return data.map(toProducer);
}

export async function wmsGetProducer(id: string): Promise<Producer | null> {
  const res = await fetch(`/api/wms/producers/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) await parseError(res, "Producteur introuvable");
  const data = (await res.json()) as WmsProducerDto;
  return toProducer(data);
}

export async function wmsCreateProducer(
  body: Omit<Producer, "id">,
): Promise<Producer> {
  const res = await fetch(`/api/wms/producers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toWmsDto(body)),
  });
  if (!res.ok) await parseError(res, "Création impossible");
  const data = (await res.json()) as WmsProducerDto;
  return toProducer(data);
}

export async function wmsUpdateProducer(
  id: string,
  body: Omit<Producer, "id">,
): Promise<Producer> {
  const res = await fetch(`/api/wms/producers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toWmsDto({ ...body, id })),
  });
  if (!res.ok) await parseError(res, "Mise à jour impossible");
  const data = (await res.json()) as WmsProducerDto;
  return toProducer({ ...data, id });
}

export async function wmsDeleteProducer(id: string): Promise<void> {
  const res = await fetch(`/api/wms/producers/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    await parseError(res, "Suppression impossible");
  }
}
