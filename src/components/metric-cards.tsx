import { formatINR, type PortfolioView } from "@/lib/calc";
import { Card, CardContent } from "@/components/ui/card";
import { TargetInvestmentCard } from "@/components/target-investment-card";

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs tracking-wide text-muted-foreground uppercase">
          {label}
        </div>
        {/* Long rupee figures must shrink rather than overflow on a phone. */}
        <div className="mt-1.5 font-mono text-xl tabular-nums break-all sm:text-2xl">
          {value}
        </div>
        {hint && (
          <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
        )}
      </CardContent>
    </Card>
  );
}

export function MetricCards({ view }: { view: PortfolioView }) {
  const investedPct =
    view.totalInvestmentTarget > 0
      ? (view.totalCurrentValue / view.totalInvestmentTarget) * 100
      : 0;

  const belowTarget = view.rows.filter((r) => r.sharesToBuyNext > 0).length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <Metric
        label="Current value"
        value={formatINR(view.totalCurrentValue)}
        hint={`${investedPct.toFixed(1)}% of target`}
      />

      <Metric
        label="Invested"
        value={view.totalPnl === null ? "—" : formatINR(view.totalInvested)}
        hint={
          view.totalPnl === null
            ? "Enter a buy price on a holding"
            : `P&L ${view.totalPnl >= 0 ? "+" : ""}${formatINR(view.totalPnl)} (${view.totalInvested > 0 ? ((view.totalPnl / view.totalInvested) * 100).toFixed(1) : "0.0"}%)`
        }
      />

      <TargetInvestmentCard value={view.totalInvestmentTarget} />

      <Metric
        label="Cost to close gaps"
        value={formatINR(view.costToCloseGaps)}
        hint={`${belowTarget} holding${belowTarget === 1 ? "" : "s"} below target`}
      />

      <Metric
        label="Holdings"
        value={String(view.holdingsCount)}
        hint={`${view.totalTargetPct.toFixed(0)}% allocated`}
      />
    </div>
  );
}
