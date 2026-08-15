import "server-only";

/**
 * Yahoo Finance — the fallback price source and the symbol-search provider.
 *
 * Undocumented and unofficial: no SLA, and it can change without notice. It is
 * kept as the fallback rather than the primary because it needs no credentials,
 * so the app still prices holdings before Upstox is configured and if the
 * Upstox token ever lapses.
 *
 * Everything Yahoo-specific lives in this file.
 */

const REQUEST_TIMEOUT_MS = 10_000;

export type YahooQuote = { ticker: string; price: number };

export type StockSuggestion = {
  ticker: string;
  name: string;
  exchange: string;
};

/**
 * Maps an NSE ticker to Yahoo's symbol. Indian equities take a `.NS` suffix,
 * and the symbol sits in a URL path, so `&` (M&M) must be encoded.
 */
function toProviderSymbol(ticker: string): string {
  return `${encodeURIComponent(ticker)}.NS`;
}

async function fetchOne(ticker: string): Promise<YahooQuote | null> {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${toProviderSymbol(ticker)}` +
    `?interval=1d&range=1d`;

  try {
    const res = await fetch(url, {
      // The endpoint 403s requests without a browser-ish UA.
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> };
    };
    const price = json.chart?.result?.[0]?.meta?.regularMarketPrice;

    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
      return null;
    }
    return { ticker, price };
  } catch {
    // Timeout, DNS failure, malformed JSON — all handled the same way.
    return null;
  }
}

/** One request per ticker; only successful lookups are returned. */
export async function fetchQuotes(tickers: string[]): Promise<YahooQuote[]> {
  const results = await Promise.all(tickers.map(fetchOne));
  return results.filter((q): q is YahooQuote => q !== null);
}

/**
 * Symbol search for the add-holding combobox.
 *
 * Restricted to NSE (`NSI`) equities: the same company lists on several
 * exchanges, and picking another would price the holding in the wrong currency.
 */
export async function searchStocks(query: string): Promise<StockSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url =
    `https://query1.finance.yahoo.com/v1/finance/search` +
    `?q=${encodeURIComponent(q)}&quotesCount=20&newsCount=0`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      // Symbol lists barely change; caching keeps keystrokes off the provider.
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return [];

    const json = (await res.json()) as {
      quotes?: Array<{
        symbol?: string;
        shortname?: string;
        longname?: string;
        exchange?: string;
        quoteType?: string;
      }>;
    };

    const seen = new Set<string>();
    const out: StockSuggestion[] = [];

    for (const quote of json.quotes ?? []) {
      if (quote.exchange !== "NSI") continue;
      if (quote.quoteType && quote.quoteType !== "EQUITY") continue;

      const symbol = quote.symbol;
      if (!symbol?.endsWith(".NS")) continue;

      const ticker = symbol.slice(0, -3);
      if (!ticker || seen.has(ticker)) continue;
      seen.add(ticker);

      out.push({
        ticker,
        name: quote.longname || quote.shortname || ticker,
        exchange: "NSE",
      });
    }

    return out.slice(0, 8);
  } catch {
    return [];
  }
}
