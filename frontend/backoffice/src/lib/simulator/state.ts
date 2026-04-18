"use client";

import { createContext, useContext } from "react";
import type { Dispatch } from "react";
import {
  emptyProject,
  type Depot,
  type SimulatorProject,
  type Tour,
  type TourStats,
} from "./types";
import { SIMULATOR_STORAGE_KEY } from "./constants";

export type SimulatorAction =
  | { type: "loadFromStorage"; project: SimulatorProject }
  | { type: "resetAll" }
  | { type: "updateDepot"; depot: Depot }
  | { type: "lockDepot" }
  | { type: "unlockDepot" }
  | { type: "addTour"; tour: Tour }
  | { type: "updateTour"; tourId: string; patch: Partial<Omit<Tour, "id">> }
  | { type: "deleteTour"; tourId: string }
  | { type: "setActiveTour"; tourId: string | null }
  | { type: "setTourStats"; tourId: string; stats: TourStats };

export function simulatorReducer(
  state: SimulatorProject,
  action: SimulatorAction,
): SimulatorProject {
  switch (action.type) {
    case "loadFromStorage":
      return action.project;
    case "resetAll":
      return emptyProject();
    case "updateDepot":
      return { ...state, depot: action.depot };
    case "lockDepot":
      return { ...state, depotLocked: true };
    case "unlockDepot":
      return { ...state, depotLocked: false };
    case "addTour":
      return {
        ...state,
        tours: [...state.tours, action.tour],
        activeTourId: action.tour.id,
      };
    case "updateTour":
      return {
        ...state,
        tours: state.tours.map((t) =>
          t.id === action.tourId ? { ...t, ...action.patch } : t,
        ),
      };
    case "deleteTour":
      return {
        ...state,
        tours: state.tours.filter((t) => t.id !== action.tourId),
        activeTourId:
          state.activeTourId === action.tourId ? null : state.activeTourId,
      };
    case "setActiveTour":
      return { ...state, activeTourId: action.tourId };
    case "setTourStats":
      return {
        ...state,
        tours: state.tours.map((t) =>
          t.id === action.tourId ? { ...t, stats: action.stats } : t,
        ),
      };
  }
}

// Persistence localStorage ────────────────────────────────────────────────

export function loadProjectFromStorage(): SimulatorProject {
  if (typeof window === "undefined") return emptyProject();
  try {
    const raw = window.localStorage.getItem(SIMULATOR_STORAGE_KEY);
    if (!raw) return emptyProject();
    return JSON.parse(raw) as SimulatorProject;
  } catch {
    return emptyProject();
  }
}

export function persistProject(project: SimulatorProject): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SIMULATOR_STORAGE_KEY,
      JSON.stringify(project),
    );
  } catch {
    // ignore quota errors silencieusement pour ne pas casser l'UX
  }
}

// Contexte React ─────────────────────────────────────────────────────────

type SimulatorCtx = {
  state: SimulatorProject;
  dispatch: Dispatch<SimulatorAction>;
};

export const SimulatorContext = createContext<SimulatorCtx | null>(null);

export function useSimulator(): SimulatorCtx {
  const ctx = useContext(SimulatorContext);
  if (!ctx) {
    throw new Error("useSimulator doit être utilisé dans SimulatorProvider");
  }
  return ctx;
}
