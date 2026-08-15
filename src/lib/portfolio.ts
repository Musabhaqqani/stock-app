import "server-only";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CACHE_TTL_MS, refreshUserPrices } from "./prices";
import { buildPortfolioView, type PortfolioView } from "./calc";
import { DEFAULT_TOTAL_INVESTMENT_TARGET } from "./seed-data";
import { loadSession } from "./session-data";

/**
 * The signed-in user plus their derived portfolio, from a single cached read.
 *
 * Rendering never waits on the price API. If prices have aged past the TTL the
 * refresh is scheduled with `after()`, which runs once the response has been
 * sent — so the page always costs one database round trip, whether prices are
 * fresh, stale, or the upstream source is hanging.
 *
 * The trade-off is that a refresh lands on the *next* load rather than this
 * one. That is the right way round: the holdings table labels how old each
 * price is, and a visibly stale number beats a page that takes 30 seconds
 * because one ticker is timing out. The Refresh button forces an immediate,
 * awaited update when someone actually wants to wait for it.
 */
export async function loadPortfolio(): Promise<{
  user: { id: string; name: string; isAdmin: boolean };
  view: PortfolioView;
}> {
  const session = await loadSession();
  if (!session) redirect("/login");

  const user = { id: session.id, name: session.name, isAdmin: session.isAdmin };
  const target =
    session.settings?.totalInvestmentTarget ?? DEFAULT_TOTAL_INVESTMENT_TARGET;

  const cutoff = Date.now() - CACHE_TTL_MS;
  const anyStale = session.stocks.some(
    (h) => !h.lastPriceUpdate || h.lastPriceUpdate.getTime() < cutoff,
  );

  if (anyStale) {
    after(async () => {
      try {
        const { updated } = await refreshUserPrices(session.id);
        // Only bust the cache if something actually changed, so a failing
        // price source doesn't spin the pages in a revalidation loop.
        if (updated > 0) {
          revalidatePath("/");
          revalidatePath("/holdings");
        }
      } catch {
        // Swallowed on purpose: this runs after the response, and a price
        // source outage must not surface as a request error.
      }
    });
  }

  return { user, view: buildPortfolioView(session.stocks, target) };
}
