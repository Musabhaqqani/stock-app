"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hashPassphrase, requireAdmin } from "@/lib/auth";
import { DEFAULT_TOTAL_INVESTMENT_TARGET } from "@/lib/seed-data";

/**
 * Admin-only user management.
 *
 * This is NOT self-registration: every action re-checks `requireAdmin()` on the
 * server, and nothing here is reachable without an existing admin session. The
 * login page links to none of it.
 */

export type AddUserState = {
  error: string | null;
  /** Shown once, immediately after creation — it is hashed and unrecoverable. */
  created: { name: string; passphrase: string } | null;
};

/** Readable passphrase — easier to type on a phone than a hex blob. */
function generatePassphrase(): string {
  return randomBytes(9).toString("base64url");
}

export async function addUserAction(
  _prev: AddUserState,
  formData: FormData,
): Promise<AddUserState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const provided = String(formData.get("passphrase") ?? "").trim();
  const isAdmin = formData.get("isAdmin") === "on";

  if (!name) return { error: "Name is required.", created: null };
  if (provided && provided.length < 8) {
    return { error: "A passphrase must be at least 8 characters.", created: null };
  }

  if (await prisma.user.findUnique({ where: { name } })) {
    return { error: `A user named "${name}" already exists.`, created: null };
  }

  const passphrase = provided || generatePassphrase();

  // Deliberately no holdings: a portfolio is personal, so a new user starts
  // empty and builds it from their own picks. Only the settings row is created,
  // to give them a target to rebalance against.
  await prisma.user.create({
    data: {
      name,
      passphraseHash: await hashPassphrase(passphrase),
      isAdmin,
      settings: {
        create: { totalInvestmentTarget: DEFAULT_TOTAL_INVESTMENT_TARGET },
      },
    },
  });

  revalidatePath("/users");
  return { error: null, created: { name, passphrase } };
}

export async function resetPassphraseAction(
  _prev: AddUserState,
  formData: FormData,
): Promise<AddUserState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing user.", created: null };

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { error: "That user no longer exists.", created: null };

  const passphrase = generatePassphrase();
  await prisma.user.update({
    where: { id },
    data: { passphraseHash: await hashPassphrase(passphrase) },
  });

  revalidatePath("/users");
  return { error: null, created: { name: user.name, passphrase } };
}

export async function deleteUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");

  // An admin deleting themselves would lock the account out of user management
  // entirely if they were the last one.
  if (!id || id === admin.id) return;

  await prisma.user.delete({ where: { id } });
  revalidatePath("/users");
}

export async function toggleAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id || id === admin.id) return; // can't demote yourself

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return;

  await prisma.user.update({
    where: { id },
    data: { isAdmin: !user.isAdmin },
  });
  revalidatePath("/users");
}
