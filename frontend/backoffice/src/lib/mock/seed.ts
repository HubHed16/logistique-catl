import type { StorageLocation, StorageZone } from "@/lib/types";

export type MockData = {
  zones: StorageZone[];
  locations: StorageLocation[];
};

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function buildSeed(): MockData {
  const fraisA: StorageZone = {
    id: uid(),
    name: "Frais A",
    type: "fresh",
    targetTemp: 4,
    tempMin: 0,
    tempMax: 7,
  };
  const sec: StorageZone = {
    id: uid(),
    name: "Sec",
    type: "dry",
    targetTemp: 15,
    tempMin: 10,
    tempMax: 20,
  };
  const congelation: StorageZone = {
    id: uid(),
    name: "Congélation",
    type: "freezer",
    targetTemp: -20,
    tempMin: -25,
    tempMax: -18,
  };

  const locations: StorageLocation[] = [
    {
      id: uid(),
      label: "Frais A · R1 · P1",
      rack: "R1",
      position: "P1",
      temperature: 4.2,
      zoneId: fraisA.id,
    },
    {
      id: uid(),
      label: "Frais A · R1 · P2",
      rack: "R1",
      position: "P2",
      temperature: 3.9,
      zoneId: fraisA.id,
    },
    {
      id: uid(),
      label: "Sec · R1 · P1",
      rack: "R1",
      position: "P1",
      temperature: null,
      zoneId: sec.id,
    },
    {
      id: uid(),
      label: "Congélation · R1 · P1",
      rack: "R1",
      position: "P1",
      temperature: -19.5,
      zoneId: congelation.id,
    },
  ];

  return {
    zones: [fraisA, sec, congelation],
    locations,
  };
}
