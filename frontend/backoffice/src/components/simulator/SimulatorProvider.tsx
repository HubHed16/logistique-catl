"use client";

import { useEffect, useReducer, useState, type ReactNode } from "react";
import {
  SimulatorContext,
  loadProjectFromStorage,
  persistProject,
  simulatorReducer,
} from "@/lib/simulator/state";
import { emptyProject } from "@/lib/simulator/types";

export function SimulatorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(simulatorReducer, emptyProject());
  const [hydrated, setHydrated] = useState(false);

  // Hydrate depuis localStorage après mount puis rend les enfants.
  // Rendre avant l'hydratation ferait doublement initialiser le form
  // (d'abord à vide, puis aux valeurs réelles) et masquerait les données
  // persistées le temps d'un flash.
  useEffect(() => {
    dispatch({
      type: "loadFromStorage",
      project: loadProjectFromStorage(),
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- flag d'hydratation one-shot, pas de boucle possible
    setHydrated(true);
  }, []);

  // Persiste à chaque mutation une fois hydraté (évite d'écraser le storage
  // avec l'emptyProject initial pendant la première frame).
  useEffect(() => {
    if (!hydrated) return;
    persistProject(state);
  }, [state, hydrated]);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-catl-text">
        Chargement du simulateur…
      </div>
    );
  }

  return (
    <SimulatorContext.Provider value={{ state, dispatch }}>
      {children}
    </SimulatorContext.Provider>
  );
}
