import { ReceptionWizard } from "@/components/reception/ReceptionWizard";

export default function ReceptionPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-catl-primary">
          Réception produit
        </h1>
        <p className="text-catl-text text-sm mt-1">
          Scanner un code-barres, vérifier le produit, enregistrer le lot et
          router vers le stock ou le xDock.
        </p>
      </header>

      <ReceptionWizard />
    </div>
  );
}
