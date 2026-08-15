import "server-only";

import { prisma } from "./db";
import { isPlausiblePrice } from "./price-guard";
import * as upstox from "./providers/upstox";
import * as yahoo from "./providers/yahoo";

/**
 * Price orchestration.
 *
 * Two providers, tried in order:
 *   1. Upstox — authoritative NSE data, one request for the whole portfolio,
 *      but needs UPSTOX_ACCESS_TOKEN.
 *   2. Yahoo — undocumented and unofficial, but needs no credentials.
 *
 * The fallback is per-ticker, not all-or-nothing: if Upstox returns 19 of 21
 * quotes, only the missing 2 are asked of Yahoo. Both providers failing leaves
 * the previous cached price in place, labelled stale in the UI, rather than
 * blanking the dashboard.
 *
 * Provider-specific code lives in ./providers/* — nothing here knows about
 * instrument keys, URL shapes or ticker suffixes.
 */

/** How long a cached price is considered good enough to serve. */
export const CACHE_TTL_MS = 15 * 60 * 1000;

export type PriceSource = "upstox" | "yahoo";

export type Quote = {
  ticker: string;
  price: number;
  fetchedAt: Date;
  source: PriceSource;
};

export type { StockSuggestion } from "./providers/yahoo";

/** Symbol search. Only Yahoo offers one; Upstox has no public search endpoint. */
export const searchStocks = yahoo.searchStocks;

/**
 * Fetches quotes for the given tickers, preferring Upstox and falling back to
 * Yahoo for whatever it could not supply.
 */
export async function fetchQuotes(
  tickers: string[],
  previous?: Map<string, number>,
): Promise<Quote[]> {
  if (tickers.length === 0) return [];

  const fetchedAt = new Date();
  const quotes = new Map<string, Quote>();

  const accept = (ticker: string, price: number, source: PriceSource) => {
    if (!isPlausiblePrice(price, previous?.get(ticker))) {
      console.warn(
        `[prices] rejected implausible ${ticker} from ${source}: ` +
          `${previous?.get(ticker)} → ${price}`,
      );
      return;
    }
    quotes.set(ticker, { ticker, price, fetchedAt, source });
  };

  if (upstox.isConfigured()) {
    for (const q of await upstox.fetchQuotes(tickers)) {
      accept(q.ticker, q.price, "upstox");
    }
  }

  const stillMissing = tickers.filter((t) => !quotes.has(t));
  if (stillMissing.length > 0) {
    for (const q of await yahoo.fetchQuotes(stillMissing)) {
      accept(q.ticker, q.price, "yahoo");
    }
  }

  return [...quotes.values()];
}

/**
 * Returns a price for every requested ticker, fetching only those whose cached
 * value has aged past the TTL. `force` refetches everything regardless.
 *
 * Tickers that fail fall back to their cached price however old it is: a stale
 * number the UI can label beats a blank dashboard.
 */
export async function getPrices(
  tickers: string[],
  { force = false }: { force?: boolean } = {},
): Promise<Map<string, Quote>> {
  const unique = [...new Set(tickers)];
  if (unique.length === 0) return new Map();

  const cached = await prisma.priceCache.findMany({
    where: { ticker: { in: unique } },
  });

  const byTicker = new Map<string, Quote>(
    cached.map((c) => [
      c.ticker,
      {
        ticker: c.ticker,
        price: c.price,
        fetchedAt: c.fetchedAt,
        source: c.source as PriceSource,
      },
    ]),
  );

  const cutoff = Date.now() - CACHE_TTL_MS;
  const stale = unique.filter((t) => {
    if (force) return true;
    const hit = byTicker.get(t);
    return !hit || hit.fetchedAt.getTime() < cutoff;
  });

  if (stale.length > 0) {
    const previous = new Map(
      [...byTicker.entries()].map(([t, q]) => [t, q.price]),
    );
    const fresh = await fetchQuotes(stale, previous);

    if (fresh.length > 0) {
      await prisma.$transaction(
        fresh.map((q) =>
          prisma.priceCache.upsert({
            where: { ticker: q.ticker },
            create: {
              ticker: q.ticker,
              price: q.price,
              fetchedAt: q.fetchedAt,
              source: q.source,
            },
            update: { price: q.price, fetchedAt: q.fetchedAt, source: q.source },
          }),
        ),
      );
      for (const q of fresh) byTicker.set(q.ticker, q);
    }
  }

  return byTicker;
}

/**
 * Refreshes prices for one user's holdings and writes them back to their rows.
 * Holdings whose fetch failed keep their existing price and timestamp, so the
 * UI can show exactly which tickers are lagging.
 */
export async function refreshUserPrices(
  userId: string,
  { force = false }: { force?: boolean } = {},
): Promise<{ updated: number; failed: string[]; sources: PriceSource[] }> {
  const holdings = await prisma.stock.findMany({
    where: { userId },
    select: { id: true, ticker: true, lastPriceUpdate: true },
  });
  if (holdings.length === 0) return { updated: 0, failed: [], sources: [] };

  const quotes = await getPrices(
    holdings.map((h) => h.ticker),
    { force },
  );

  const writes = [];
  const failed: string[] = [];
  const sources = new Set<PriceSource>();

  for (const holding of holdings) {
    const quote = quotes.get(holding.ticker);
    if (!quote) {
      failed.push(holding.ticker);
      continue;
    }
    sources.add(quote.source);

    // Skip the write if this holding already carries this exact fetch.
    if (holding.lastPriceUpdate?.getTime() === quote.fetchedAt.getTime()) continue;

    writes.push(
      prisma.stock.update({
        where: { id: holding.id },
        data: { price: quote.price, lastPriceUpdate: quote.fetchedAt },
      }),
    );
  }

  if (writes.length > 0) await prisma.$transaction(writes);

  return { updated: writes.length, failed, sources: [...sources] };
}
