"use client";

import { createContext, useContext } from "react";
import type { Dispatch } from "react";

// Clé localStorage pour garder le producteur sélectionné entre sessions.
export const CURRENT_PRODUCER_KEY = "catl.simulator.currentProducerId.v1";

export type SimulatorState = {
  /** UUID du producteur actuellement sélectionné (ou null si aucun). */
  currentProducerId: string | null;
  /** Route sélectionnée pour édition (phase 2). */
  activeRouteId: string | null;
  /** Coords capturées par clic-sur-carte, en attente que la sidebar ouvre le formulaire. */
  pendingStopCoords: { lat: number; lng: number } | null;
};

export type SimulatorAction =
  | { type: "setCurrentProducer"; producerId: string | null }
  | { type: "setActiveRoute"; routeId: string | null }
  | { type: "setPendingStopCoords"; coords: { lat: number; lng: number } }
  | { type: "clearPendingStopCoords" };

export function simulatorReducer(
  state: SimulatorState,
  action: SimulatorAction,
): SimulatorState {
  switch (action.type) {
    case "setCurrentProducer":
      return {
        ...state,
        currentProducerId: action.producerId,
        activeRouteId: null,
        pendingStopCoords: null,
      };
    case "setActiveRoute":
      return {
        ...state,
        activeRouteId: action.routeId,
        pendingStopCoords: null,
      };
    case "setPendingStopCoords":
      return { ...state, pendingStopCoords: action.coords };
    case "clearPendingStopCoords":
      return { ...state, pendingStopCoords: null };
  }
}

export function initialState(): SimulatorState {
  return {
    currentProducerId: null,
    activeRouteId: null,
    pendingStopCoords: null,
  };
}

export function loadCurrentProducerIdFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CURRENT_PRODUCER_KEY);
  } catch {
    return null;
  }
}

export function persistCurrentProducerId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(CURRENT_PRODUCER_KEY, id);
    else window.localStorage.removeItem(CURRENT_PRODUCER_KEY);
  } catch {
    // ignore
  }
}

type SimulatorCtx = {
  state: SimulatorState;
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
