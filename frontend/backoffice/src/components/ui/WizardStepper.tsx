import { Check } from "lucide-react";

type Step = {
  label: string;
  description?: string;
};

type WizardStepperProps = {
  steps: Step[];
  current: number; // 0-indexed current step
};

export function WizardStepper({ steps, current }: WizardStepperProps) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto pb-1">
      {steps.map((step, i) => {
        const isActive = i === current;
        const isDone = i < current;
        return (
          <li
            key={step.label}
            className="flex items-center gap-2 flex-1 min-w-fit"
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border-2 transition-colors ${
                  isDone
                    ? "bg-catl-success border-catl-success text-white"
                    : isActive
                      ? "bg-catl-accent border-catl-accent text-white"
                      : "bg-white border-gray-200 text-catl-text"
                }`}
                aria-current={isActive ? "step" : undefined}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </span>
              <div className="leading-tight">
                <div
                  className={`text-xs font-bold uppercase tracking-wide ${
                    isActive
                      ? "text-catl-primary"
                      : isDone
                        ? "text-catl-success"
                        : "text-catl-text"
                  }`}
                >
                  {step.label}
                </div>
                {step.description && (
                  <div className="text-[10px] text-catl-text/70">
                    {step.description}
                  </div>
                )}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 ${
                  i < current ? "bg-catl-success" : "bg-gray-200"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
