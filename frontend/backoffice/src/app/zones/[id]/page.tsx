"use client";

import Link from "next/link";
import { use } from "react";
import { ChevronLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, SectionTitle } from "@/components/ui/Card";
import { ZoneTypeBadge, zoneTypeLabel } from "@/components/ui/ZoneTypeBadge";
import { LocationList } from "@/components/zones/LocationList";
import { useZone } from "@/lib/hooks/zones";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function ZoneDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: zone, isLoading, isError, error } = useZone(id);

  if (isLoading) {
    return (
      <div className="text-sm text-catl-text">Chargement de la zone...</div>
    );
  }

  if (isError || !zone) {
    const msg = error instanceof Error ? error.message : "Zone introuvable";
    return (
      <div className="catl-card">
        <p className="text-sm text-catl-danger">{msg}</p>
        <Link href="/zones" className="text-sm underline mt-2 inline-block">
          Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href="/zones"
        className="inline-flex items-center gap-1 text-sm text-catl-text hover:text-catl-primary"
      >
        <ChevronLeft className="w-4 h-4" />
        Retour à la liste des zones
      </Link>

      <Card>
        <CardTitle
          action={
            <Link href={`/zones/${zone.id}/edit`}>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Pencil className="w-3.5 h-3.5" />}
              >
                Éditer
              </Button>
            </Link>
          }
        >
          {zone.name}
        </CardTitle>

        <dl className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <Stat label="Type">
            <ZoneTypeBadge type={zone.type} />
            <div className="text-xs text-catl-text mt-1">
              {zoneTypeLabel(zone.type)}
            </div>
          </Stat>
          <Stat label="Cible (°C)">
            <span className="font-mono text-lg text-catl-primary">
              {zone.targetTemp.toFixed(1)}
            </span>
          </Stat>
          <Stat label="Plage (°C)">
            <span className="font-mono text-catl-primary">
              {zone.tempMin.toFixed(1)} → {zone.tempMax.toFixed(1)}
            </span>
          </Stat>
          <Stat label="Emplacements">
            <span className="font-mono text-lg text-catl-primary">
              {zone.locationsCount ?? 0}
            </span>
          </Stat>
        </dl>
      </Card>

      <Card>
        <SectionTitle>Emplacements</SectionTitle>
        <LocationList zoneId={zone.id} />
      </Card>
    </div>
  );
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-catl-text mb-1">
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
