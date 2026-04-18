import { buildSeed, type MockData } from "./seed";

// Bumper à chaque changement de forme du seed / des types stockés
// afin d'éviter d'afficher des données localStorage obsolètes.
const STORAGE_KEY = "catl.mock-data.v4";

let cache: MockData | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function load(): MockData {
  if (cache) return cache;
  if (!isBrowser()) {
    cache = buildSeed();
    return cache;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      cache = JSON.parse(raw) as MockData;
      return cache;
    } catch {
      // fall through to seed
    }
  }
  cache = buildSeed();
  persist();
  return cache;
}

function persist() {
  if (!isBrowser() || !cache) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
}

export const mockStore = {
  getData(): MockData {
    return load();
  },
  setData(updater: (data: MockData) => void): MockData {
    const data = load();
    updater(data);
    persist();
    return data;
  },
  reset(): MockData {
    cache = buildSeed();
    persist();
    return cache;
  },
};

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
