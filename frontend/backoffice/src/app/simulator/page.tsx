import { SimulatorProvider } from "@/components/simulator/SimulatorProvider";
import { SimulatorShell } from "@/components/simulator/SimulatorShell";

export default function SimulatorPage() {
  return (
    <SimulatorProvider>
      <SimulatorShell />
    </SimulatorProvider>
  );
}
