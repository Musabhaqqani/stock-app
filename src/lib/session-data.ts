import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { SESSION_COOKIE, verifySessionToken } from "./session";

/**
 * The one database read a signed-in page needs.
 *
 * The session cookie is signed and carries the user id, so identifying the
 * caller costs no query at all — which means the user record and their whole
 * portfolio can be fetched together in a single round trip. With the database
 * ~1.3s away, round trips are the entire performance budget: this is one, and
 * `cache` shares it between the layout (which needs the name for the sidebar)
 * and the page (which needs the holdings).
 *
 * `relationLoadStrategy: "join"` matters — without it Prisma issues one query
 * per relation and the saving disappears.
 */
export const loadSession = cache(async () => {
  const store = await cookies();
  const userId = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (!userId) return null;

  // A valid signature isn't enough — the row may have been deleted since.
  return prisma.user.findUnique({
    where: { id: userId },
    relationLoadStrategy: "join",
    select: {
      id: true,
      name: true,
      isAdmin: true,
      settings: { select: { totalInvestmentTarget: true } },
      stocks: { orderBy: [{ targetPct: "desc" }, { name: "asc" }] },
    },
  });
});

export type SessionData = NonNullable<Awaited<ReturnType<typeof loadSession>>>;
