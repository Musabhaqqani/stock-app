import { AlertTriangle } from "lucide-react";
import { formatINR, formatPct } from "@/lib/calc";

/**
 * Target weights are user-editable and need not sum to 100.
 *
 * When they don't, only part of the investment target is actually allocated to
 * stocks — which is worth saying in rupees, because the abstract version
 * ("target values will not sum to your target") reliably confuses people.
 */
export function TargetWeightNotice({
  totalTargetPct,
  totalInvestmentTarget,
}: {
  totalTargetPct: number;
  totalInvestmentTarget: number;
}) {
  if (Math.abs(totalTargetPct - 100) <= 0.01) return null;

  const allocated = (totalTargetPct / 100) * totalInvestmentTarget;
  const remainingPct = 100 - totalTargetPct;
  const over = remainingPct < 0;

  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-under/40 bg-under/10 px-4 py-3 text-sm text-under">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-1">
        <p className="font-medium">
          Your target weights add up to {formatPct(totalTargetPct)}, not 100%.
        </p>
        <p className="text-under/85">
          {over ? (
            <>
              That plans for {formatINR(allocated)} against a target of{" "}
              {formatINR(totalInvestmentTarget)} — you have over-allocated by{" "}
              {formatINR(-1 * (totalInvestmentTarget - allocated))}. Lower some
              target percentages so they total 100%.
            </>
          ) : (
            <>
              Only {formatINR(allocated)} of your {formatINR(totalInvestmentTarget)}{" "}
              target is assigned to stocks; the remaining{" "}
              {formatPct(remainingPct)} ({formatINR(totalInvestmentTarget - allocated)})
              isn&apos;t allocated to anything. Add holdings or raise target
              percentages until they total 100%.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
