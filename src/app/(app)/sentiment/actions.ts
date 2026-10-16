"use server";

import { requireUser } from "@/lib/auth";
import { analyseSentiment, type SentimentReport } from "@/lib/sentiment";

export type SentimentResult =
  | { ok: true; report: SentimentReport }
  | { ok: false; error: string };

/**
 * Any NSE stock, not just holdings — but only for signed-in users, so the app
 * isn't an open relay burning the Gemini quota. Ticker and name come from the
 * client and end up in search queries and the prompt, so both are validated.
 */
export async function analyseSentimentAction(
  ticker: string,
  name: string,
  force = false,
): Promise<SentimentResult> {
  await requireUser();

  const t = String(ticker).trim().toUpperCase();
  const n = String(name).trim();
  if (!/^[A-Z0-9&-]{1,20}$/.test(t) || n.length < 2 || n.length > 100) {
    return { ok: false, error: "Pick a stock from the search first." };
  }

  try {
    return { ok: true, report: await analyseSentiment(t, n, force) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Analysis failed." };
  }
}
