"use server";

import { requireUser } from "@/lib/auth";
import { searchStocks, getPrices, type StockSuggestion } from "@/lib/prices";

export type SuggestionWithPrice = StockSuggestion & { price: number | null };

/**
 * Typeahead for the add-holding search.
 *
 * Behind `requireUser()` because it proxies an outbound request — leaving it
 * open would let anyone use the app as an unauthenticated search relay.
 */
export async function searchStocksAction(
  query: string,
): Promise<SuggestionWithPrice[]> {
  await requireUser();

  const matches = await searchStocks(query);
  if (matches.length === 0) return [];

  // Prices come from the shared cache, so showing them in the dropdown usually
  // costs nothing; uncached tickers just render without one.
  const quotes = await getPrices(matches.map((m) => m.ticker)).catch(
    () => new Map(),
  );

  return matches.map((m) => ({
    ...m,
    price: quotes.get(m.ticker)?.price ?? null,
  }));
}
