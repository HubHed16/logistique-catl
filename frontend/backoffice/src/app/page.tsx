import Link from "next/link";
import { Inbox, Layers, History } from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div className="catl-card">
        <h1 className="text-2xl font-bold text-catl-primary mb-2">
          Back-office CATL
        </h1>
        <p className="text-catl-text">
          Pilotage des flux entrepôt de la Ceinture Aliment-Terre Liégeoise :
          réception des livraisons producteurs, gestion des zones de stockage et
          traçabilité des actions.
        </p>
      </div>

      <section>
        <h2 className="catl-section-title">Raccourcis</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/reception"
            className="catl-card hover:shadow-md transition-shadow block"
          >
            <div className="flex items-center gap-3 mb-2">
              <Inbox className="w-5 h-5 text-catl-accent" />
              <span className="font-bold text-catl-primary">Réception</span>
            </div>
            <p className="text-sm text-catl-text">
              Scanner un code-barres et enregistrer une nouvelle réception.
            </p>
          </Link>

          <Link
            href="/zones"
            className="catl-card hover:shadow-md transition-shadow block"
          >
            <div className="flex items-center gap-3 mb-2">
              <Layers className="w-5 h-5 text-catl-accent" />
              <span className="font-bold text-catl-primary">Zones</span>
            </div>
            <p className="text-sm text-catl-text">
              Gérer les zones et emplacements de stockage.
            </p>
          </Link>

          <Link
            href="/history"
            className="catl-card hover:shadow-md transition-shadow block"
          >
            <div className="flex items-center gap-3 mb-2">
              <History className="w-5 h-5 text-catl-accent" />
              <span className="font-bold text-catl-primary">Historique</span>
            </div>
            <p className="text-sm text-catl-text">
              Consulter la chronologie des actions effectuées.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
