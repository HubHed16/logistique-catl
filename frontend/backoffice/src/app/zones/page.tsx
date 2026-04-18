import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ZoneList } from "@/components/zones/ZoneList";

export default function ZonesPage() {
  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-catl-primary">
            Zones de stockage
          </h1>
          <p className="text-catl-text text-sm mt-1">
            Définissez les zones de l&apos;entrepôt (frais, sec, congélation…) et
            leurs emplacements physiques.
          </p>
        </div>
        <Link href="/zones/new">
          <Button leftIcon={<Plus className="w-4 h-4" />}>Nouvelle zone</Button>
        </Link>
      </header>

      <ZoneList />
    </div>
  );
}
