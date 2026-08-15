import { formatINR, formatPct, type HoldingRow } from "@/lib/calc";
import { Badge } from "@/components/ui/badge";

export function BuyNextList({
  rows,
  empty = false,
}: {
  rows: HoldingRow[];
  /** True when the portfolio itself is empty, not merely fully on target. */
  empty?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {empty
          ? "No holdings yet — add stocks on the Holdings page to see what to buy next."
          : "Every holding is at or above its target weight. Nothing to buy."}
      </p>
    );
  }

  return (
    <ol className="divide-y divide-border">
      {rows.map((row, i) => (
        <li key={row.id} className="flex items-center gap-3 py-3 first:pt-0">
          <span className="w-5 shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
            {i + 1}
          </span>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{row.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {row.ticker} · {row.theme}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <Badge
              variant="outline"
              className="border-under/40 font-mono tabular-nums text-under"
            >
              +{row.sharesToBuyNext}
            </Badge>
            <div className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
              {/*
                A holding can be overweight by current value yet still need
                shares: gap measures against today's portfolio value, while
                targetShares measures against the total investment target.
              */}
              {formatINR(row.costToBuyNext)} · {formatPct(Math.abs(row.gap))}{" "}
              {row.gap >= 0 ? "under" : "over"}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
