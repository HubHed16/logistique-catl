import rawDump from "@/data/simulator-dump.json";

type RawStats = {
  ca?: number | string;
  cost?: number | string;
  dist?: number | string;
  time?: number | string;
  ratio?: number | string;
};

type RawTour = {
  id?: string;
  day?: string;
  name?: string;
  stats?: RawStats;
};

type RawRecord = {
  id: number;
  created_at: string;
  nom_producteur: string;
  data_json?: {
    tours?: RawTour[];
  };
};

const DUMP = rawDump as RawRecord[];

const DAY_ORDER = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
] as const;

function num(v: number | string | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function cleanProducerName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export type ProducerProfitability = {
  producer: string;
  ca: number;
  cost: number;
  margin: number;
  ratio: number;
  tours: number;
};

export function getProducerProfitability(): ProducerProfitability[] {
  const byProducer = new Map<string, ProducerProfitability>();

  for (const rec of DUMP) {
    const producer = cleanProducerName(rec.nom_producteur);
    const tours = rec.data_json?.tours ?? [];

    const entry = byProducer.get(producer) ?? {
      producer,
      ca: 0,
      cost: 0,
      margin: 0,
      ratio: 0,
      tours: 0,
    };

    for (const t of tours) {
      entry.ca += num(t.stats?.ca);
      entry.cost += num(t.stats?.cost);
      entry.tours += 1;
    }

    byProducer.set(producer, entry);
  }

  return Array.from(byProducer.values())
    .map((e) => ({
      ...e,
      margin: e.ca - e.cost,
      ratio: e.cost > 0 ? e.ca / e.cost : 0,
    }))
    .sort((a, b) => b.ca - a.ca);
}

export type ToursByDay = {
  day: string;
  count: number;
};

export function getToursByDay(): ToursByDay[] {
  const counts: Record<string, number> = {};

  for (const rec of DUMP) {
    for (const t of rec.data_json?.tours ?? []) {
      const day = t.day ?? "—";
      counts[day] = (counts[day] ?? 0) + 1;
    }
  }

  return DAY_ORDER.map((day) => ({ day, count: counts[day] ?? 0 }));
}

export type OverviewKpis = {
  producerCount: number;
  tourCount: number;
  totalCa: number;
  totalCost: number;
  avgRatio: number;
};

export function getOverviewKpis(): OverviewKpis {
  const producers = new Set<string>();
  let tourCount = 0;
  let totalCa = 0;
  let totalCost = 0;

  for (const rec of DUMP) {
    producers.add(cleanProducerName(rec.nom_producteur));
    for (const t of rec.data_json?.tours ?? []) {
      tourCount += 1;
      totalCa += num(t.stats?.ca);
      totalCost += num(t.stats?.cost);
    }
  }

  return {
    producerCount: producers.size,
    tourCount,
    totalCa,
    totalCost,
    avgRatio: totalCost > 0 ? totalCa / totalCost : 0,
  };
}
