"use client";

import { useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import {
  SimulatorContext,
  initialState,
  loadCurrentProducerIdFromStorage,
  persistCurrentProducerId,
  simulatorReducer,
} from "@/lib/simulator/state";

export function SimulatorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(simulatorReducer, initialState());
  const [hydrated, setHydrated] = useState(false);

  // Hydrate currentProducerId depuis localStorage une fois côté client,
  // puis débloque le rendu des enfants (évite un flash "pas de producteur"
  // alors que le user en a sélectionné un à la dernière visite).
  useEffect(() => {
    const id = loadCurrentProducerIdFromStorage();
    if (id) dispatch({ type: "setCurrentProducer", producerId: id });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- flag d'hydratation one-shot
    setHydrated(true);
  }, []);

  // Persiste à chaque changement de producteur.
  useEffect(() => {
    if (!hydrated) return;
    persistCurrentProducerId(state.currentProducerId);
  }, [state.currentProducerId, hydrated]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-catl-text">
        Chargement du simulateur…
      </div>
    );
  }

  return (
    <SimulatorContext.Provider value={value}>
      {children}
    </SimulatorContext.Provider>
  );
}
