/**
 * Sanity check on incoming prices. Pure, so it can be tested without a network
 * or a database.
 *
 * This guards the one failure mode staleness labels cannot catch: a provider
 * returning a wrong-but-plausible number — another exchange's price, a stale
 * close, a mis-resolved symbol. Such a value would silently corrupt every
 * derived figure on the dashboard, and nothing in the UI would look broken.
 */

/** Real single-session NSE moves are bounded by circuit limits well inside this. */
export const MAX_PLAUSIBLE_MOVE = 0.5; // ±50%

export function isPlausiblePrice(
  next: number,
  previous: number | undefined,
): boolean {
  // Reject prices that are not usable numbers regardless of history.
  if (!Number.isFinite(next) || next <= 0) return false;

  // No history to compare against — a first price is accepted as given.
  if (previous === undefined || !Number.isFinite(previous) || previous <= 0) {
    return true;
  }

  return Math.abs(next - previous) / previous <= MAX_PLAUSIBLE_MOVE;
}
