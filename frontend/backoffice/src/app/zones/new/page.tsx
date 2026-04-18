import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ZoneForm } from "@/components/zones/ZoneForm";

export default function NewZonePage() {
  return (
    <div className="space-y-5">
      <Link
        href="/zones"
        className="inline-flex items-center gap-1 text-sm text-catl-text hover:text-catl-primary"
      >
        <ChevronLeft className="w-4 h-4" />
        Retour à la liste des zones
      </Link>
      <ZoneForm />
    </div>
  );
}
