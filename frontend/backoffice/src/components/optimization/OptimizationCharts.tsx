"use client";

import { BarChart3, PieChart as PieIcon, Trophy } from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AXIS_TICK,
  CATL_COLORS,
  CHART_MARGIN,
  EUR_FORMATTER,
  EUR_FORMATTER_PRECISE,
  NUM_FORMATTER,
} from "@/components/charts/ChartTheme";
import { CatlTooltipCard } from "@/components/charts/Tooltip";
import type {
  OptimizationResult,
  OptimizationStopAssignment,
} from "@/lib/simulator/types";

function shortId(id: string): string {
  return id.slice(0, 8);
}

type ComparisonDatum = {
  key: string;
  label: string;
  value: number;
  color: string;
};

type ModeDatum = {
  name: string;
  value: number;
  color: string;
};

type TopGainDatum = {
  stopId: string;
  shortStopId: string;
  producerId: string;
  routeId: string;
  gain: number;
  directCost: number;
  viaHubCost: number;
};

export function OptimizationCharts({ result }: { result: OptimizationResult }) {
  const savingsPct = useMemo(
    () =>
      result.baselineAllDirectCostEur > 0
        ? (result.savingsEur / result.baselineAllDirectCostEur) * 100
        : 0,
    [result.baselineAllDirectCostEur, result.savingsEur],
  );

  const comparisonData = useMemo<ComparisonDatum[]>(
    () => [
      {
        key: "baseline",
        label: "Tout direct",
        value: result.baselineAllDirectCostEur,
        color: CATL_COLORS.neutral,
      },
      {
        key: "optimized",
        label: "Optimisé",
        value: result.optimizedCostEur,
        color: CATL_COLORS.success,
      },
    ],
    [result.baselineAllDirectCostEur, result.optimizedCostEur],
  );

  const modeData = useMemo<ModeDatum[]>(() => {
    const direct = result.assignments.filter((a) => a.mode === "DIRECT").length;
    const viaHub = result.assignments.filter(
      (a) => a.mode === "VIA_HUB",
    ).length;
    return [
      { name: "Direct", value: direct, color: CATL_COLORS.info },
      { name: "Via hub", value: viaHub, color: CATL_COLORS.accent },
    ].filter((d) => d.value > 0);
  }, [result.assignments]);

  const topGains = useMemo<TopGainDatum[]>(() => {
    return result.assignments
      .filter(
        (a): a is OptimizationStopAssignment & { viaHubCostEur: number } =>
          a.mode === "VIA_HUB" && a.viaHubCostEur != null,
      )
      .map((a) => ({
        stopId: a.stopId,
        shortStopId: shortId(a.stopId),
        producerId: a.producerId,
        routeId: a.routeId,
        gain: a.directCostEur - a.viaHubCostEur,
        directCost: a.directCostEur,
        viaHubCost: a.viaHubCostEur,
      }))
      .filter((d) => d.gain > 0)
      .sort((a, b) => b.gain - a.gain)
      .slice(0, 10);
  }, [result.assignments]);

  const totalStops = result.stopCount;

  return (
    <section className="catl-section catl-section--accent">
      <span className="catl-section-pill">
        <BarChart3 className="w-3 h-3" /> Visualisations
      </span>
      <p className="text-xs text-catl-text mt-1 mb-3">
        Trois lectures complémentaires du plan : coût global avant/après,
        répartition des modes de livraison et arrêts où l&apos;optimiseur fait
        gagner le plus.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Baseline vs Optimisé"
          subtitle={`Économie : ${EUR_FORMATTER_PRECISE.format(
            result.savingsEur,
          )} (${NUM_FORMATTER.format(savingsPct)} %)`}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={comparisonData}
              margin={{ ...CHART_MARGIN, top: 24 }}
            >
              <XAxis
                dataKey="label"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={{ stroke: CATL_COLORS.bg }}
              />
              <YAxis
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => EUR_FORMATTER.format(v)}
              />
              <Tooltip
                cursor={{ fill: "rgba(52,73,94,0.04)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as ComparisonDatum;
                  return (
                    <CatlTooltipCard
                      title={d.label}
                      rows={[
                        {
                          label: "Coût",
                          value: EUR_FORMATTER_PRECISE.format(d.value),
                          color: d.color,
                        },
                      ]}
                    />
                  );
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {comparisonData.map((d) => (
                  <Cell key={d.key} fill={d.color} />
                ))}
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(label) =>
                    typeof label === "number"
                      ? EUR_FORMATTER.format(label)
                      : String(label ?? "")
                  }
                  style={{
                    fill: CATL_COLORS.primary,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          icon={<PieIcon className="w-3 h-3" />}
          title="Direct vs Via hub"
          subtitle={`${totalStops} arrêt${totalStops > 1 ? "s" : ""} au total`}
        >
          {modeData.length === 0 ? (
            <EmptyChart label="Aucun arrêt affecté" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as ModeDatum;
                    const pct = totalStops > 0 ? (d.value / totalStops) * 100 : 0;
                    return (
                      <CatlTooltipCard
                        title={d.name}
                        rows={[
                          {
                            label: "Arrêts",
                            value: String(d.value),
                            color: d.color,
                          },
                          {
                            label: "Part",
                            value: `${NUM_FORMATTER.format(pct)} %`,
                          },
                        ]}
                      />
                    );
                  }}
                />
                <Pie
                  data={modeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={92}
                  paddingAngle={2}
                  stroke="#fff"
                  strokeWidth={2}
                  label={({ name, value }) =>
                    `${name} (${value})`
                  }
                  labelLine={false}
                >
                  {modeData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          icon={<Trophy className="w-3 h-3" />}
          title="Top 10 arrêts par gain"
          subtitle="Économie via hub (coût direct − coût hub)"
        >
          {topGains.length === 0 ? (
            <EmptyChart label="Aucun gain mesuré" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={topGains}
                layout="vertical"
                margin={{ ...CHART_MARGIN, left: 24 }}
              >
                <XAxis
                  type="number"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={{ stroke: CATL_COLORS.bg }}
                  tickFormatter={(v: number) => EUR_FORMATTER.format(v)}
                />
                <YAxis
                  type="category"
                  dataKey="shortStopId"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Tooltip
                  cursor={{ fill: "rgba(52,73,94,0.04)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as TopGainDatum;
                    return (
                      <CatlTooltipCard
                        title={`Arrêt ${d.shortStopId}`}
                        rows={[
                          {
                            label: "Gain",
                            value: EUR_FORMATTER_PRECISE.format(d.gain),
                            color: CATL_COLORS.success,
                          },
                          {
                            label: "Direct",
                            value: EUR_FORMATTER_PRECISE.format(d.directCost),
                          },
                          {
                            label: "Via hub",
                            value: EUR_FORMATTER_PRECISE.format(d.viaHubCost),
                          },
                        ]}
                        footer={
                          <span className="font-mono">
                            Prod {shortId(d.producerId)} · Route{" "}
                            {shortId(d.routeId)}
                          </span>
                        }
                      />
                    );
                  }}
                />
                <Bar
                  dataKey="gain"
                  fill={CATL_COLORS.success}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </section>
  );
}

function ChartCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-md border border-gray-200 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-semibold text-catl-text/70">
        {icon}
        {title}
      </div>
      {subtitle && (
        <div className="text-xs text-catl-primary font-semibold mt-0.5">
          {subtitle}
        </div>
      )}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-[260px] flex items-center justify-center text-xs text-catl-text/60">
      {label}
    </div>
  );
}
