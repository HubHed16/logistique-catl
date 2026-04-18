"use client";

import { useEffect, useReducer, type ReactNode } from "react";
import {
  SimulatorContext,
  loadProjectFromStorage,
  persistProject,
  simulatorReducer,
} from "@/lib/simulator/state";
import { emptyProject } from "@/lib/simulator/types";

export function SimulatorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(simulatorReducer, emptyProject());

  // Hydrate depuis localStorage après mount (SSR-safe)
  useEffect(() => {
    const loaded = loadProjectFromStorage();
    dispatch({ type: "loadFromStorage", project: loaded });
  }, []);

  // Persiste à chaque mutation
  useEffect(() => {
    persistProject(state);
  }, [state]);

  return (
    <SimulatorContext.Provider value={{ state, dispatch }}>
      {children}
    </SimulatorContext.Provider>
  );
}
