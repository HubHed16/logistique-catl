"use client";

import {
  BarChart3,
  Calendar,
  Coins,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { Kpi } from "@/components/ui/Kpi";
import { ProducerProfitabilityChart } from "@/components/dashboard/ProducerProfitabilityChart";
import { ToursByDayChart } from "@/components/dashboard/ToursByDayChart";
import {
  EUR_FORMATTER,
  NUM_FORMATTER,
} from "@/components/charts/ChartTheme";
import {
  getOverviewKpis,
  getProducerProfitability,
  getToursByDay,
} from "@/lib/dashboard/simulator-data";

export function HomeOverview() {
  const kpis = getOverviewKpis();
  const profitability = getProducerProfitability();
  const toursByDay = getToursByDay();

  const marginAbs = kpis.totalCa - kpis.totalCost;
  const marginPct = kpis.totalCa > 0 ? marginAbs / kpis.totalCa : 0;

  return (
    <section className="space-y-4">
      <div className="catl-section catl-section--primary">
        <span className="catl-section-pill">
          <Sparkles className="w-3 h-3" /> Aperçu logistique
        </span>
        <p className="text-sm text-catl-text mt-1">
          Synthèse des tournées simulées sur la semaine — agrégées depuis les
          dumps du simulateur de coûts CATL.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <Kpi
            label="Producteurs actifs"
            value={NUM_FORMATTER.format(kpis.producerCount)}
            icon={<Users className="w-4 h-4" />}
          />
          <Kpi
            label="Tournées hebdo"
            value={NUM_FORMATTER.format(kpis.tourCount)}
            icon={<Calendar className="w-4 h-4" />}
          />
          <Kpi
            label="CA hebdo cumulé"
            value={EUR_FORMATTER.format(kpis.totalCa)}
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <Kpi
            label={`Marge (${(marginPct * 100).toFixed(0)} %)`}
            value={EUR_FORMATTER.format(marginAbs)}
            icon={<Coins className="w-4 h-4" />}
            emphasis
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="catl-section catl-section--info">
          <span className="catl-section-pill">
            <BarChart3 className="w-3 h-3" /> Rentabilité par producteur
          </span>
          <p className="text-xs text-catl-text mt-1 mb-3">
            Chiffre d&apos;affaires vs coût logistique cumulés, tournées
            confondues. Plus l&apos;écart bleu/orange est grand, plus la
            tournée est rentable.
          </p>
          <ProducerProfitabilityChart data={profitability} />
        </div>

        <div className="catl-section catl-section--accent">
          <span className="catl-section-pill">
            <TrendingDown className="w-3 h-3" /> Répartition hebdomadaire
          </span>
          <p className="text-xs text-catl-text mt-1 mb-3">
            Nombre de tournées planifiées par jour de la semaine — permet
            d&apos;identifier les pics de charge et les créneaux sous-utilisés.
          </p>
          <ToursByDayChart data={toursByDay} />
        </div>
      </div>
    </section>
  );
}
