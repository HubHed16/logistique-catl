"use client";

import Link from "next/link";
import { use } from "react";
import { ChevronLeft } from "lucide-react";
import { ZoneForm } from "@/components/zones/ZoneForm";
import { useZone } from "@/lib/hooks/zones";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function EditZonePage({ params }: PageProps) {
  const { id } = use(params);
  const { data: zone, isLoading, isError } = useZone(id);

  return (
    <div className="space-y-5">
      <Link
        href={`/zones/${id}`}
        className="inline-flex items-center gap-1 text-sm text-catl-text hover:text-catl-primary"
      >
        <ChevronLeft className="w-4 h-4" />
        Retour au détail
      </Link>

      {isLoading && (
        <div className="text-sm text-catl-text">Chargement...</div>
      )}

      {(isError || (!isLoading && !zone)) && (
        <div className="catl-card">
          <p className="text-sm text-catl-danger">Zone introuvable.</p>
        </div>
      )}

      {zone && <ZoneForm initialZone={zone} />}
    </div>
  );
}
