import "server-only";

import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { GUEST_STOCKS } from "./seed-data";
import { SESSION_COOKIE, createSessionToken } from "./session";
import { loadSession } from "./session-data";

export const BCRYPT_ROUNDS = 12;

export function hashPassphrase(passphrase: string): Promise<string> {
  return bcrypt.hash(passphrase, BCRYPT_ROUNDS);
}

/**
 * Verifies a name + passphrase against the allowlist and, on success, sets the
 * session cookie. Returns false for both "no such user" and "wrong passphrase"
 * so the login screen can't be used to enumerate who has access.
 */
export async function login(
  name: string,
  passphrase: string,
): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { name: name.trim() } });

  if (!user) {
    // Spend the same time as a real comparison would, so a missing user isn't
    // detectable by how fast the request comes back.
    await bcrypt.compare(passphrase, `$2a$${BCRYPT_ROUNDS}$${"x".repeat(53)}`);
    return false;
  }

  if (!(await bcrypt.compare(passphrase, user.passphraseHash))) return false;

  await startSession(user.id);
  return true;
}

const GUEST_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Signs the visitor into a fresh demo account, one per click, so guests never
 * see or overwrite each other's edits. The empty passphrase hash never matches
 * bcrypt, so the account is reachable only through the cookie set here.
 *
 * ponytail: no rate limit — each click creates a user + holdings, bounded only
 * by the 24 h sweep. Add an IP throttle if the button gets abused.
 */
export async function loginAsGuest(): Promise<void> {
  const user = await prisma.user.create({
    data: {
      name: `Guest ${randomBytes(3).toString("hex")}`,
      passphraseHash: "",
      isGuest: true,
      stocks: { createMany: { data: GUEST_STOCKS } },
    },
    select: { id: true },
  });
  await startSession(user.id);

  // Sweep expired guests after the response, so it costs the visitor nothing.
  // Their holdings go with them via the cascade.
  after(() =>
    prisma.user
      .deleteMany({
        where: {
          isGuest: true,
          createdAt: { lt: new Date(Date.now() - GUEST_TTL_MS) },
        },
      })
      .catch(() => {}),
  );
}

async function startSession(userId: string): Promise<void> {
  const { token, expiresAt } = createSessionToken(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export type SessionUser = { id: string; name: string; isAdmin: boolean };

/**
 * The logged-in user, or null.
 *
 * Delegates to `loadSession`, which is request-cached — so the layout, the page
 * and any action in the same render share a single database round trip.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await loadSession();
  if (!session) return null;
  return { id: session.id, name: session.name, isAdmin: session.isAdmin };
}

/**
 * The logged-in user, or a redirect to /login. Every page and mutation outside
 * the login flow goes through this.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Gate for user administration. Non-admins are sent to the dashboard rather
 * than shown a 403, so the page's existence isn't advertised. Every admin
 * action re-checks this server-side — hiding the nav link is not access control.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/");
  return user;
}
