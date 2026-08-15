import { createHmac, timingSafeEqual } from "crypto";

/**
 * Session cookie: `<userId>.<expiryMs>.<hmac>`.
 *
 * The signature covers the expiry too, so a client can't extend its own
 * session by editing the cookie. This is deliberately smaller than a JWT
 * library — one signed cookie checked against the users table is all the
 * session state a private, allowlist-only app needs.
 */

export const SESSION_COOKIE = "portfolio_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    throw new Error(
      "SESSION_SECRET is not set — copy .env.example to .env and fill it in.",
    );
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function createSessionToken(userId: string): {
  token: string;
  expiresAt: Date;
} {
  const expiryMs = Date.now() + SESSION_DURATION_MS;
  const payload = `${userId}.${expiryMs}`;
  return {
    token: `${payload}.${sign(payload)}`,
    expiresAt: new Date(expiryMs),
  };
}

/** Returns the userId if the token is well-formed, unexpired and correctly signed. */
export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [userId, expiryRaw, signature] = parts;
  const expected = sign(`${userId}.${expiryRaw}`);

  // Compare in constant time so the signature can't be guessed byte by byte.
  const given = Buffer.from(signature, "hex");
  const want = Buffer.from(expected, "hex");
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;

  const expiryMs = Number(expiryRaw);
  if (!Number.isFinite(expiryMs) || expiryMs < Date.now()) return null;

  return userId;
}
