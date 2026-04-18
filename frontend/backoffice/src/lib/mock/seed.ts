import type {
  Producer,
  Product,
  StockItem,
  StorageLocation,
  StorageZone,
} from "@/lib/types";

export type MockData = {
  cooperativeId: string;
  zones: StorageZone[];
  locations: StorageLocation[];
  producers: Producer[];
  products: Product[];
  stockItems: StockItem[];
};

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function buildSeed(): MockData {
  const cooperativeId = uid();

  const frais: StorageZone = {
    id: uid(),
    name: "Frais A",
    type: "fresh",
    targetTemp: 4,
    tempMin: 0,
    tempMax: 7,
  };
  const ambiant: StorageZone = {
    id: uid(),
    name: "Ambiant",
    type: "ambient",
    targetTemp: 18,
    tempMin: 10,
    tempMax: 25,
  };
  const congelation: StorageZone = {
    id: uid(),
    name: "Congélation",
    type: "negative",
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
      zoneId: frais.id,
    },
    {
      id: uid(),
      label: "Frais A · R1 · P2",
      rack: "R1",
      position: "P2",
      temperature: 3.9,
      zoneId: frais.id,
    },
    {
      id: uid(),
      label: "Ambiant · R1 · P1",
      rack: "R1",
      position: "P1",
      temperature: null,
      zoneId: ambiant.id,
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

  const fermeMartin: Producer = {
    id: uid(),
    name: "Ferme Martin",
    contact: "contact@ferme-martin.be",
    address: "Rue du Champ 12, 4000 Liège",
    province: "Liège",
    isBio: true,
  };
  const rucheBleue: Producer = {
    id: uid(),
    name: "La Ruche Bleue",
    contact: "hello@ruchebleue.be",
    address: "Place du Village 3, 5000 Namur",
    province: "Namur",
    isBio: true,
  };
  const boulangerie: Producer = {
    id: uid(),
    name: "Boulangerie du Centre",
    contact: "info@boulangerie-centre.be",
    address: "Avenue Rogier 88, 4000 Liège",
    province: "Liège",
    isBio: false,
  };

  const products: Product[] = [
    {
      id: uid(),
      name: "Carottes bio",
      category: "Légumes-racines",
      ean: "3760000000001",
      unit: "kg",
      storageType: "fresh",
      isBio: true,
      certification: "Certisys",
      producerId: fermeMartin.id,
    },
    {
      id: uid(),
      name: "Pommes Jonagold",
      category: "Fruits",
      ean: "3760000000002",
      unit: "kg",
      storageType: "fresh",
      isBio: true,
      certification: "Certisys",
      producerId: fermeMartin.id,
    },
    {
      id: uid(),
      name: "Miel toutes fleurs",
      category: "Apiculture",
      ean: "3760000000003",
      unit: "piece",
      storageType: "ambient",
      isBio: true,
      certification: null,
      producerId: rucheBleue.id,
    },
    {
      id: uid(),
      name: "Pain au levain",
      category: "Boulangerie",
      ean: "3760000000004",
      unit: "piece",
      storageType: "ambient",
      isBio: false,
      certification: null,
      producerId: boulangerie.id,
    },
    {
      id: uid(),
      name: "Courgettes bio",
      category: "Légumes-fruits",
      ean: "3760000000005",
      unit: "kg",
      storageType: "fresh",
      isBio: true,
      certification: "Certisys",
      producerId: fermeMartin.id,
    },
  ];

  return {
    cooperativeId,
    zones: [frais, ambiant, congelation],
    locations,
    producers: [fermeMartin, rucheBleue, boulangerie],
    products,
    stockItems: [],
  };
}
