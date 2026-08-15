/**
 * Portfolio maths. Pure functions, no I/O — everything the dashboard shows is
 * derived here so the numbers can be unit-tested without a database.
 */

export type Holding = {
  id: string;
  name: string;
  ticker: string;
  theme: string;
  targetPct: number;
  price: number;
  shares: number;
  lastPriceUpdate: Date | string | null;
};

export type HoldingRow = Holding & {
  currentValue: number;
  currentWeightPct: number;
  targetValue: number;
  targetShares: number;
  sharesToBuyNext: number;
  costToBuyNext: number;
  /** targetPct − currentWeightPct. Positive = underweight, negative = overweight. */
  gap: number;
};

export type PortfolioView = {
  rows: HoldingRow[];
  totalCurrentValue: number;
  totalInvestmentTarget: number;
  /** What it would cost to buy every share in the buy-next list. */
  costToCloseGaps: number;
  /** Sum of targetPct across holdings — surfaced so the UI can warn if it isn't 100. */
  totalTargetPct: number;
  holdingsCount: number;
  /** Most recent live price fetch across all holdings, or null if none ever fetched. */
  lastPriceUpdate: Date | null;
};

/**
 * Derives every per-stock and portfolio-level figure in one pass.
 *
 * `totalInvestmentTarget` is the INR the user intends to have invested overall;
 * each stock's target value is its slice of that, which is what makes
 * "shares still to buy" a number rather than a vibe.
 */
export function buildPortfolioView(
  holdings: Holding[],
  totalInvestmentTarget: number,
): PortfolioView {
  const totalCurrentValue = holdings.reduce(
    (sum, h) => sum + h.price * h.shares,
    0,
  );

  const rows: HoldingRow[] = holdings.map((h) => {
    const currentValue = h.price * h.shares;

    // Guard the division: an empty portfolio has no weights, only targets.
    const currentWeightPct =
      totalCurrentValue > 0 ? (currentValue / totalCurrentValue) * 100 : 0;

    const targetValue = (h.targetPct / 100) * totalInvestmentTarget;

    // A zero/missing price makes target share count meaningless rather than
    // infinite — fall back to holding steady until a real price arrives.
    const targetShares = h.price > 0 ? Math.round(targetValue / h.price) : h.shares;

    const sharesToBuyNext = Math.max(targetShares - h.shares, 0);

    return {
      ...h,
      currentValue,
      currentWeightPct,
      targetValue,
      targetShares,
      sharesToBuyNext,
      costToBuyNext: sharesToBuyNext * h.price,
      gap: h.targetPct - currentWeightPct,
    };
  });

  const timestamps = holdings
    .map((h) => (h.lastPriceUpdate ? new Date(h.lastPriceUpdate) : null))
    .filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()));

  return {
    rows,
    totalCurrentValue,
    totalInvestmentTarget,
    costToCloseGaps: rows.reduce((sum, r) => sum + r.costToBuyNext, 0),
    totalTargetPct: holdings.reduce((sum, h) => sum + h.targetPct, 0),
    holdingsCount: holdings.length,
    lastPriceUpdate: timestamps.length
      ? new Date(Math.max(...timestamps.map((d) => d.getTime())))
      : null,
  };
}

/**
 * The "buy next" ranking: the most underweight stock you can actually still
 * buy shares of, first. This is a mechanical gap-to-target ordering, not a
 * judgement about any company.
 */
export function buyNextRanking(rows: HoldingRow[]): HoldingRow[] {
  return rows
    .filter((r) => r.sharesToBuyNext > 0)
    .sort((a, b) => b.gap - a.gap);
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(value: number): string {
  return inr.format(Math.round(value));
}

export function formatPct(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}
