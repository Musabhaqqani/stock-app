import { describe, expect, it } from "vitest";
import { isPlausiblePrice } from "./price-guard";

describe("isPlausiblePrice", () => {
  it("accepts a normal day's move", () => {
    expect(isPlausiblePrice(1050, 1000)).toBe(true);
    expect(isPlausiblePrice(950, 1000)).toBe(true);
  });

  it("accepts the first price for a ticker with no history", () => {
    expect(isPlausiblePrice(14_000, undefined)).toBe(true);
  });

  it("rejects a price that is not a usable number", () => {
    expect(isPlausiblePrice(0, 1000)).toBe(false);
    expect(isPlausiblePrice(-5, 1000)).toBe(false);
    expect(isPlausiblePrice(Number.NaN, 1000)).toBe(false);
    expect(isPlausiblePrice(Number.POSITIVE_INFINITY, 1000)).toBe(false);
  });

  it("rejects a wrong-but-plausible number from another exchange", () => {
    // The classic failure: a US listing quoted in dollars where the NSE price
    // is in rupees. Looks like a real price, is off by an order of magnitude.
    expect(isPlausiblePrice(23, 1992)).toBe(false);
  });

  it("rejects an implausible jump in either direction", () => {
    expect(isPlausiblePrice(2000, 1000)).toBe(false); // +100%
    expect(isPlausiblePrice(400, 1000)).toBe(false); // −60%
  });

  it("accepts moves right at the boundary", () => {
    expect(isPlausiblePrice(1500, 1000)).toBe(true); // +50% exactly
    expect(isPlausiblePrice(500, 1000)).toBe(true); // −50% exactly
  });

  it("treats a corrupt previous price as no history rather than blocking updates", () => {
    // A bad cached value must not permanently reject every real price.
    expect(isPlausiblePrice(1000, 0)).toBe(true);
    expect(isPlausiblePrice(1000, Number.NaN)).toBe(true);
  });
});
