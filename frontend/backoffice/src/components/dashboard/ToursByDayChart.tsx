"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AXIS_TICK,
  CATL_COLORS,
  CHART_MARGIN,
} from "@/components/charts/ChartTheme";
import { CatlTooltipCard } from "@/components/charts/Tooltip";
import type { ToursByDay } from "@/lib/dashboard/simulator-data";

export function ToursByDayChart({ data }: { data: ToursByDay[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={CHART_MARGIN}>
        <CartesianGrid stroke={CATL_COLORS.bg} vertical={false} />
        <XAxis
          dataKey="day"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: CATL_COLORS.bg }}
          interval={0}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(52,73,94,0.04)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as ToursByDay;
            return (
              <CatlTooltipCard
                title={d.day}
                rows={[
                  {
                    label: "Tournées",
                    value: String(d.count),
                    color: CATL_COLORS.primary,
                  },
                ]}
              />
            );
          }}
        />
        <Bar
          dataKey="count"
          name="Tournées"
          fill={CATL_COLORS.primary}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
