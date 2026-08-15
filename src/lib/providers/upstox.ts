import "server-only";

import { gunzipSync } from "zlib";
import { prisma } from "../db";

/**
 * Upstox market-data provider — the primary price source.
 *
 * Chosen over the free-tier alternatives for two reasons:
 *   1. Up to 500 instruments per request, so the whole portfolio is ONE call.
 *   2. Its "analytics token" is generated once and does not expire daily, which
 *      is the only way an unattended background refresh can keep working.
 *
 * Scope is deliberately read-only market data. The token never touches the
 * database — it lives in UPSTOX_ACCESS_TOKEN — and no order endpoint is called
 * from anywhere in this codebase.
 *
 * If the token is absent or any call fails, callers fall back to the secondary
 * provider; this module never throws.
 */

const LTP_ENDPOINT = "https://api.upstox.com/v3/market-quote/ltp";
const INSTRUMENTS_URL =
  "https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz";

const REQUEST_TIMEOUT_MS = 10_000;
const INSTRUMENTS_TIMEOUT_MS = 60_000;

/** Upstox addresses instruments per request; 500 is the documented ceiling. */
const MAX_INSTRUMENTS_PER_REQUEST = 500;

/** How long a cached ticker→instrument mapping stays trusted. */
const INSTRUMENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type UpstoxQuote = { ticker: string; price: number };

export function isConfigured(): boolean {
  return Boolean(process.env.UPSTOX_ACCESS_TOKEN);
}

type InstrumentRecord = {
  segment?: string;
  instrument_type?: string;
  trading_symbol?: string;
  instrument_key?: string;
  name?: string;
};

/**
 * Downloads and parses the NSE instrument master.
 *
 * ~2 MB gzipped, ~2,600 equities. Called only when a ticker isn't already
 * mapped, which in practice means the first refresh and then whenever a new
 * holding is added.
 */
async function fetchInstrumentMaster(): Promise<Map<string, InstrumentRecord>> {
  const res = await fetch(INSTRUMENTS_URL, {
    signal: AbortSignal.timeout(INSTRUMENTS_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`instrument master: HTTP ${res.status}`);

  const json = JSON.parse(
    gunzipSync(Buffer.from(await res.arrayBuffer())).toString("utf8"),
  ) as InstrumentRecord[];

  const map = new Map<string, InstrumentRecord>();
  for (const record of json) {
    // Cash-segment equities only: derivatives share trading symbols and would
    // otherwise overwrite the equity row.
    if (record.segment !== "NSE_EQ" || record.instrument_type !== "EQ") continue;
    if (!record.trading_symbol || !record.instrument_key) continue;
    map.set(record.trading_symbol, record);
  }
  return map;
}

/**
 * Resolves tickers to Upstox instrument keys, filling gaps from the master file
 * and caching the result. Tickers with no NSE equity listing are simply absent
 * from the returned map.
 */
export async function resolveInstrumentKeys(
  tickers: string[],
): Promise<Map<string, string>> {
  const wanted = [...new Set(tickers)];
  if (wanted.length === 0) return new Map();

  const cached = await prisma.instrument.findMany({
    where: { ticker: { in: wanted } },
  });

  const fresh = Date.now() - INSTRUMENT_TTL_MS;
  const resolved = new Map<string, string>();
  for (const row of cached) {
    if (row.updatedAt.getTime() >= fresh) resolved.set(row.ticker, row.instrumentKey);
  }

  const missing = wanted.filter((t) => !resolved.has(t));
  if (missing.length === 0) return resolved;

  const master = await fetchInstrumentMaster();

  const writes = [];
  for (const ticker of missing) {
    const record = master.get(ticker);
    if (!record?.instrument_key) continue;

    resolved.set(ticker, record.instrument_key);
    writes.push(
      prisma.instrument.upsert({
        where: { ticker },
        create: {
          ticker,
          instrumentKey: record.instrument_key,
          name: record.name ?? ticker,
        },
        update: {
          instrumentKey: record.instrument_key,
          name: record.name ?? ticker,
        },
      }),
    );
  }
  if (writes.length > 0) await prisma.$transaction(writes);

  return resolved;
}

type LtpResponse = {
  status?: string;
  data?: Record<
    string,
    { last_price?: number; instrument_token?: string } | undefined
  >;
};

async function fetchBatch(
  instrumentKeys: string[],
  keyToTicker: Map<string, string>,
): Promise<UpstoxQuote[]> {
  const url = `${LTP_ENDPOINT}?instrument_key=${instrumentKeys
    .map(encodeURIComponent)
    .join(",")}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${process.env.UPSTOX_ACCESS_TOKEN}`,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`ltp: HTTP ${res.status}`);

  const json = (await res.json()) as LtpResponse;
  const out: UpstoxQuote[] = [];

  for (const [responseKey, value] of Object.entries(json.data ?? {})) {
    const price = value?.last_price;
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
      continue;
    }

    // The response key is not reliably the instrument_key we sent — depending
    // on version it can be `NSE_EQ:SYMBOL`. `instrument_token` echoes the key,
    // so try that first and fall back to parsing the trading symbol out.
    const token = value?.instrument_token;
    const ticker =
      (token ? keyToTicker.get(token) : undefined) ??
      keyToTicker.get(responseKey) ??
      (responseKey.includes(":") ? responseKey.split(":")[1] : undefined);

    if (ticker) out.push({ ticker, price });
  }

  return out;
}

/**
 * Fetches last-traded prices. Returns only tickers that resolved and quoted —
 * a partial result is normal, and an empty array signals "use the fallback".
 */
export async function fetchQuotes(tickers: string[]): Promise<UpstoxQuote[]> {
  if (!isConfigured() || tickers.length === 0) return [];

  try {
    const resolved = await resolveInstrumentKeys(tickers);
    if (resolved.size === 0) return [];

    const keyToTicker = new Map(
      [...resolved.entries()].map(([ticker, key]) => [key, ticker]),
    );
    const keys = [...resolved.values()];

    const batches: string[][] = [];
    for (let i = 0; i < keys.length; i += MAX_INSTRUMENTS_PER_REQUEST) {
      batches.push(keys.slice(i, i + MAX_INSTRUMENTS_PER_REQUEST));
    }

    const results = await Promise.all(
      batches.map((batch) =>
        fetchBatch(batch, keyToTicker).catch(() => [] as UpstoxQuote[]),
      ),
    );
    return results.flat();
  } catch {
    // Token expired, network failure, master file unreachable — all mean the
    // same thing to the caller: nothing from this provider, use the fallback.
    return [];
  }
}
