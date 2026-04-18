"use client";

import { createContext, useContext } from "react";
import type { Dispatch } from "react";

// Clé localStorage pour garder le producteur sélectionné entre sessions.
export const CURRENT_PRODUCER_KEY = "catl.simulator.currentProducerId.v1";

export type SimulatorState = {
  /** UUID du producteur actuellement sélectionné (ou null si aucun). */
  currentProducerId: string | null;
  /** L'utilisateur est en mode "clic carte pour placer le dépôt". */
  pickMode: boolean;
  /** Route sélectionnée pour édition (phase 2). */
  activeRouteId: string | null;
};

export type SimulatorAction =
  | { type: "setCurrentProducer"; producerId: string | null }
  | { type: "setPickMode"; pickMode: boolean }
  | { type: "setActiveRoute"; routeId: string | null };

export function simulatorReducer(
  state: SimulatorState,
  action: SimulatorAction,
): SimulatorState {
  switch (action.type) {
    case "setCurrentProducer":
      return { ...state, currentProducerId: action.producerId };
    case "setPickMode":
      return { ...state, pickMode: action.pickMode };
    case "setActiveRoute":
      return { ...state, activeRouteId: action.routeId };
  }
}

export function initialState(): SimulatorState {
  return {
    currentProducerId: null,
    pickMode: false,
    activeRouteId: null,
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
