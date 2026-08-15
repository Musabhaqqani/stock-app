"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { HoldingRow } from "@/lib/calc";

/**
 * Current vs target weight per holding.
 *
 * Colours come from CSS variables rather than literals so the chart follows the
 * light/dark toggle — a hardcoded hex would only look right in one theme.
 */
const config = {
  target: { label: "Target", color: "var(--muted-foreground)" },
  current: { label: "Current", color: "var(--under)" },
} satisfies ChartConfig;

export function WeightChart({ rows }: { rows: HoldingRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Add a holding to see the weight comparison.
      </p>
    );
  }

  const data = rows.map((r) => ({
    ticker: r.ticker,
    current: Number(r.currentWeightPct.toFixed(2)),
    target: r.targetPct,
    gap: r.gap,
  }));

  return (
    <div>
      <ChartContainer
        config={config}
        className="w-full"
        style={{ height: Math.max(280, rows.length * 26) }}
      >
        <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 8 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" unit="%" tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="ticker"
            width={92}
            tickLine={false}
            axisLine={false}
            tick={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => [
                  `${Number(value).toFixed(2)}%  `,
                  config[name as keyof typeof config]?.label ?? name,
                ]}
              />
            }
          />
          {/* Target sits behind as a muted reference; current is the live bar. */}
          <Bar dataKey="target" fill="var(--color-target)" radius={2} opacity={0.35} />
          <Bar dataKey="current" radius={2}>
            {data.map((d) => (
              <Cell
                key={d.ticker}
                // Amber = still below target, red = overshot it.
                fill={d.gap >= 0 ? "var(--under)" : "var(--over)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm bg-under" /> under target
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm bg-over" /> over target
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm bg-muted-foreground/35" />{" "}
          target
        </span>
      </div>
    </div>
  );
}
