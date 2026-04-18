"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
import type { ProducerProfitability } from "@/lib/dashboard/simulator-data";

type ChartDatum = ProducerProfitability & { shortName: string };

function shortName(name: string): string {
  const cleaned = name.replace(/["']/g, "").trim();
  return cleaned.length > 14 ? `${cleaned.slice(0, 13)}…` : cleaned;
}

export function ProducerProfitabilityChart({
  data,
}: {
  data: ProducerProfitability[];
}) {
  const chartData: ChartDatum[] = data.map((d) => ({
    ...d,
    shortName: shortName(d.producer),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={CHART_MARGIN}>
        <CartesianGrid stroke={CATL_COLORS.bg} vertical={false} />
        <XAxis
          dataKey="shortName"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: CATL_COLORS.bg }}
          interval={0}
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
            const d = payload[0].payload as ChartDatum;
            return (
              <CatlTooltipCard
                title={d.producer}
                rows={[
                  {
                    label: "CA",
                    value: EUR_FORMATTER_PRECISE.format(d.ca),
                    color: CATL_COLORS.info,
                  },
                  {
                    label: "Coût",
                    value: EUR_FORMATTER_PRECISE.format(d.cost),
                    color: CATL_COLORS.accent,
                  },
                  {
                    label: "Marge",
                    value: EUR_FORMATTER_PRECISE.format(d.margin),
                  },
                ]}
                footer={
                  <span>
                    Ratio CA/Coût&nbsp;
                    <strong>{NUM_FORMATTER.format(d.ratio)}×</strong>
                    {" · "}
                    {d.tours} tournée{d.tours > 1 ? "s" : ""}
                  </span>
                }
              />
            );
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: CATL_COLORS.text }}
        />
        <Bar
          dataKey="ca"
          name="Chiffre d'affaires"
          fill={CATL_COLORS.info}
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="cost"
          name="Coût"
          fill={CATL_COLORS.accent}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
