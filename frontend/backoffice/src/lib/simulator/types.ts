import type {
  DriverType,
  FuelType,
  ProductionType,
  StopOpType,
  TourDay,
  VehicleType,
} from "./constants";

export interface DepotPosition {
  lat: number | null;
  lon: number | null;
  addr: string;
  name: string;
}

export interface DepotInfra {
  sec: number; // m²
  frais: number;
  neg: number;
  prep: number;
}

export interface DepotVehicle {
  type: VehicleType;
  fuel: FuelType;
  cons: number; // L ou kWh /100km
  price: number; // €/L ou €/kWh
  amort: number; // €/km (amort + entretien)
  frigo: boolean;
  driver: DriverType;
  cH: number; // €/h du personnel
  tPrep: number; // min
  tLoad: number; // min
}

export interface Depot {
  pData: DepotPosition;
  job: ProductionType[];
  mail: string;
  infra: DepotInfra;
  veh: DepotVehicle;
}

export interface TourStop {
  id: string;
  client: string;
  addr: string;
  lat: number;
  lon: number;
  opType: StopOpType;
  euro: number;
  time: number; // temps d'arrêt en minutes
}

export interface TourStats {
  cost: number;
  ca: number;
  ratio: number | null; // % coût/CA, null si CA=0
  dist: number; // km
  time: number; // minutes
}

export interface Tour {
  id: string;
  name: string;
  day: TourDay;
  stops: TourStop[];
  stats: TourStats;
}

export interface SimulatorProject {
  depot: Depot;
  tours: Tour[];
  activeTourId: string | null;
  depotLocked: boolean;
}

export function emptyDepot(): Depot {
  return {
    pData: { lat: null, lon: null, addr: "", name: "" },
    job: [],
    mail: "",
    infra: { sec: 0, frais: 0, neg: 0, prep: 0 },
    veh: {
      type: "Fourgon compact (3-6m³)",
      fuel: "Diesel",
      cons: 8.5,
      price: 1.75,
      amort: 0.25,
      frigo: false,
      driver: "Producteur.rice (Soi-même)",
      cH: 18,
      tPrep: 30,
      tLoad: 20,
    },
  };
}

export function emptyProject(): SimulatorProject {
  return {
    depot: emptyDepot(),
    tours: [],
    activeTourId: null,
    depotLocked: false,
  };
}
