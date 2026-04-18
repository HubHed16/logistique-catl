"use client";

import { Check, Map, Package, Send } from "lucide-react";

export type StepperStep = "depot" | "tours" | "export";

type Step = {
  key: StepperStep;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const STEPS: Step[] = [
  { key: "depot", label: "Dépôt", icon: Map },
  { key: "tours", label: "Tournées", icon: Package },
  { key: "export", label: "Export", icon: Send },
];

type Props = {
  current: StepperStep;
  depotLocked: boolean;
  toursCount: number;
};

export function StepperBar({ current, depotLocked, toursCount }: Props) {
  const done: Record<StepperStep, boolean> = {
    depot: depotLocked,
    tours: depotLocked && toursCount > 0,
    export: false,
  };

  return (
    <nav aria-label="Progression" className="catl-stepper">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const isActive = s.key === current;
        const isDone = done[s.key] && !isActive;
        return (
          <div key={s.key} className="flex items-center flex-1 min-w-fit">
            <div
              className={`catl-step ${
                isActive
                  ? "catl-step--active"
                  : isDone
                    ? "catl-step--done"
                    : ""
              }`}
            >
              {isDone ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Icon className="w-3.5 h-3.5" />
              )}
              <span>{s.label}</span>
              {s.key === "tours" && toursCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-white/20 text-[10px] font-bold">
                  {toursCount}
                </span>
              )}
            </div>
            {i < STEPS.length - 1 && <div className="catl-step-sep" />}
          </div>
        );
      })}
    </nav>
  );
}
