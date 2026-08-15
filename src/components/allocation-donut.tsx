"use client";

import { Cell, Label, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatINR, type HoldingRow } from "@/lib/calc";

/**
 * Allocation by theme. Slices cycle shadcn's five chart variables, which are
 * defined per theme, so the ramp stays legible in both light and dark.
 */
const SLICE_VARS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function AllocationDonut({ rows }: { rows: HoldingRow[] }) {
  const held = rows.filter((r) => r.currentValue > 0);

  if (held.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No shares held yet.
      </p>
    );
  }

  // Group by theme — 21 individual slices is unreadable, and theme allocation
  // is the thing actually worth eyeballing.
  const byTheme = new Map<string, number>();
  for (const row of held) {
    byTheme.set(row.theme, (byTheme.get(row.theme) ?? 0) + row.currentValue);
  }

  const data = [...byTheme.entries()]
    .map(([theme, value], i) => ({
      name: theme,
      value,
      fill: SLICE_VARS[i % SLICE_VARS.length],
    }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  const config: ChartConfig = Object.fromEntries(
    data.map((d, i) => [
      d.name,
      { label: d.name, color: SLICE_VARS[i % SLICE_VARS.length] },
    ]),
  );

  return (
    <div>
      <ChartContainer config={config} className="mx-auto aspect-square max-h-[280px]">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value, name) => [
                  `${formatINR(Number(value))} (${((Number(value) / total) * 100).toFixed(1)}%)  `,
                  name,
                ]}
              />
            }
          />
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" strokeWidth={2}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.fill} />
            ))}
            {/* Total in the hole — otherwise the donut needs an external caption. */}
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox)) return null;
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-foreground font-mono text-lg font-semibold"
                    >
                      {formatINR(total)}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy ?? 0) + 20}
                      className="fill-muted-foreground text-xs"
                    >
                      invested
                    </tspan>
                  </text>
                );
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>

      <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2">
            <span
              className="inline-block size-2.5 shrink-0 rounded-sm"
              style={{ background: d.fill }}
            />
            <span className="truncate text-muted-foreground">{d.name}</span>
            <span className="ml-auto shrink-0 font-mono tabular-nums text-muted-foreground">
              {((d.value / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
