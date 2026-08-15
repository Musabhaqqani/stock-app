import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
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

  const { token, expiresAt } = createSessionToken(user.id);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return true;
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
