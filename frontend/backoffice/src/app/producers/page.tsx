import { SimulatorProvider } from "@/components/simulator/SimulatorProvider";
import { ProducersShell } from "@/components/simulator/ProducersShell";

export default function ProducersPage() {
  return (
    <SimulatorProvider>
      <ProducersShell />
    </SimulatorProvider>
  );
}
