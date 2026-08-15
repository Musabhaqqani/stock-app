import { describe, expect, it } from "vitest";
import { buildPortfolioView, buyNextRanking, type Holding } from "./calc";

function holding(overrides: Partial<Holding> = {}): Holding {
  return {
    id: "1",
    name: "Test Co",
    ticker: "TEST",
    theme: "Testing",
    targetPct: 50,
    price: 100,
    shares: 1,
    lastPriceUpdate: null,
    ...overrides,
  };
}

describe("buildPortfolioView", () => {
  it("derives value, weight and target figures for a holding", () => {
    const view = buildPortfolioView(
      [holding({ price: 100, shares: 2, targetPct: 50 })],
      10_000,
    );
    const row = view.rows[0];

    expect(row.currentValue).toBe(200);
    expect(row.currentWeightPct).toBe(100); // sole holding
    expect(row.targetValue).toBe(5_000);
    expect(row.targetShares).toBe(50);
    expect(row.sharesToBuyNext).toBe(48);
    expect(row.costToBuyNext).toBe(4_800);
    expect(row.gap).toBe(-50); // 50% target vs 100% actual
  });

  it("splits weights across holdings by value, not by count", () => {
    const view = buildPortfolioView(
      [
        holding({ id: "a", ticker: "A", price: 300, shares: 1 }),
        holding({ id: "b", ticker: "B", price: 100, shares: 1 }),
      ],
      1_000,
    );

    expect(view.totalCurrentValue).toBe(400);
    expect(view.rows[0].currentWeightPct).toBe(75);
    expect(view.rows[1].currentWeightPct).toBe(25);
  });

  it("treats an empty portfolio as zero weight rather than dividing by zero", () => {
    const view = buildPortfolioView(
      [holding({ price: 100, shares: 0, targetPct: 40 })],
      10_000,
    );

    expect(view.totalCurrentValue).toBe(0);
    expect(view.rows[0].currentWeightPct).toBe(0);
    expect(view.rows[0].gap).toBe(40); // fully underweight
    expect(Number.isFinite(view.rows[0].targetShares)).toBe(true);
  });

  it("holds share count steady when a price is missing", () => {
    // A failed fetch must not produce an infinite target share count.
    const view = buildPortfolioView([holding({ price: 0, shares: 7 })], 10_000);

    expect(view.rows[0].targetShares).toBe(7);
    expect(view.rows[0].sharesToBuyNext).toBe(0);
  });

  it("never reports a negative buy quantity for an overweight holding", () => {
    const view = buildPortfolioView(
      [holding({ price: 100, shares: 100, targetPct: 10 })],
      10_000,
    );

    expect(view.rows[0].targetShares).toBe(10);
    expect(view.rows[0].sharesToBuyNext).toBe(0); // sell signals are out of scope
  });

  it("reports the newest price timestamp across holdings", () => {
    const older = new Date("2026-08-15T09:00:00Z");
    const newer = new Date("2026-08-15T11:00:00Z");
    const view = buildPortfolioView(
      [
        holding({ id: "a", ticker: "A", lastPriceUpdate: older }),
        holding({ id: "b", ticker: "B", lastPriceUpdate: newer }),
        holding({ id: "c", ticker: "C", lastPriceUpdate: null }),
      ],
      1_000,
    );

    expect(view.lastPriceUpdate).toEqual(newer);
  });
});

describe("buyNextRanking", () => {
  it("ranks by gap descending and drops holdings already at target", () => {
    const view = buildPortfolioView(
      [
        // At target already — should not appear.
        holding({ id: "done", ticker: "DONE", price: 100, shares: 50, targetPct: 25 }),
        holding({ id: "mild", ticker: "MILD", price: 100, shares: 10, targetPct: 25 }),
        holding({ id: "worst", ticker: "WORST", price: 100, shares: 1, targetPct: 50 }),
      ],
      20_000,
    );

    const ranked = buyNextRanking(view.rows);

    expect(ranked.map((r) => r.ticker)).toEqual(["WORST", "MILD"]);
    expect(ranked[0].gap).toBeGreaterThan(ranked[1].gap);
  });

  it("still lists a holding that is overweight today but short of its target value", () => {
    // Counterintuitive but correct: gap is measured against the portfolio's
    // *current* value, while targetShares is measured against the *total
    // investment target*. Early on, when little is invested, an expensive stock
    // can dominate current weight while still being far below its target value.
    const view = buildPortfolioView(
      [
        holding({ id: "pricey", ticker: "PRICEY", price: 14_000, shares: 1, targetPct: 5 }),
        holding({ id: "cheap", ticker: "CHEAP", price: 100, shares: 1, targetPct: 95 }),
      ],
      1_000_000,
    );

    const pricey = view.rows.find((r) => r.ticker === "PRICEY")!;

    expect(pricey.currentWeightPct).toBeGreaterThan(pricey.targetPct); // overweight now
    expect(pricey.gap).toBeLessThan(0);
    expect(pricey.sharesToBuyNext).toBeGreaterThan(0); // yet still short of target value
    expect(buyNextRanking(view.rows).map((r) => r.ticker)).toContain("PRICEY");
  });

  it("returns nothing when every holding is at or above target", () => {
    const view = buildPortfolioView(
      [holding({ price: 100, shares: 999, targetPct: 10 })],
      1_000,
    );

    expect(buyNextRanking(view.rows)).toEqual([]);
  });
});
