"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { logout, requireUser } from "@/lib/auth";
import { refreshUserPrices } from "@/lib/prices";
import { averageIn, sellOut } from "@/lib/calc";

/**
 * Every action re-derives the user from the session cookie rather than trusting
 * an id from the form, so one logged-in user can never touch another's rows.
 */

function parseNumber(value: FormDataEntryValue | null, fallback = 0): number {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
}

export async function refreshPricesAction(): Promise<{
  updated: number;
  failed: string[];
  sources: string[];
}> {
  const user = await requireUser();
  const result = await refreshUserPrices(user.id, { force: true });

  revalidatePath("/");
  revalidatePath("/holdings");

  // Returned so the client can report which tickers failed and which provider
  // actually served the prices — the only way to confirm Upstox is live.
  return result;
}

export async function addStockAction(formData: FormData) {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const ticker = String(formData.get("ticker") ?? "").trim().toUpperCase();
  const theme = String(formData.get("theme") ?? "").trim() || "Unclassified";
  const targetPct = parseNumber(formData.get("targetPct"));
  const shares = Math.max(0, Math.round(parseNumber(formData.get("shares"))));
  const price = Math.max(0, parseNumber(formData.get("price")));
  const buyPrice = Math.max(0, parseNumber(formData.get("buyPrice")));

  if (!name || !ticker) return;

  await prisma.stock.upsert({
    where: { userId_ticker: { userId: user.id, ticker } },
    create: { userId: user.id, name, ticker, theme, targetPct, shares, price, buyPrice },
    // Re-adding an existing ticker updates it instead of erroring.
    update: { name, theme, targetPct, shares, price, buyPrice },
  });

  revalidatePath("/");
  revalidatePath("/holdings");
}

export async function updateStockAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const data: Record<string, number | string> = {};

  // Only apply fields the form actually submitted, so the inline table can
  // send a single changed cell without clobbering the rest of the row.
  if (formData.has("shares")) {
    data.shares = Math.max(0, Math.round(parseNumber(formData.get("shares"))));
  }
  if (formData.has("targetPct")) {
    data.targetPct = Math.max(0, parseNumber(formData.get("targetPct")));
  }
  if (formData.has("price")) {
    data.price = Math.max(0, parseNumber(formData.get("price")));
  }
  if (formData.has("buyPrice")) {
    data.buyPrice = Math.max(0, parseNumber(formData.get("buyPrice")));
  }
  if (formData.has("theme")) data.theme = String(formData.get("theme"));

  if (Object.keys(data).length === 0) return;

  // Scoping the update by userId as well as id makes a forged id a no-op.
  await prisma.stock.updateMany({ where: { id, userId: user.id }, data });
  revalidatePath("/");
  revalidatePath("/holdings");
}

/** Records a buy (re-averages the buy price) or a sell (keeps it). */
export async function recordTradeAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const qty = Math.round(parseNumber(formData.get("qty")));
  const price = parseNumber(formData.get("price"));
  const sell = formData.get("side") === "sell";
  if (!id || qty <= 0 || (!sell && price <= 0)) return;

  // ponytail: read-then-write, not atomic; fine for one person editing their own rows.
  const stock = await prisma.stock.findFirst({ where: { id, userId: user.id } });
  if (!stock) return;

  await prisma.stock.updateMany({
    where: { id, userId: user.id },
    data: sell
      ? sellOut(stock.shares, stock.buyPrice, qty)
      : averageIn(stock.shares, stock.buyPrice, qty, price),
  });
  revalidatePath("/");
  revalidatePath("/holdings");
}

export async function deleteStockAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.stock.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/");
  revalidatePath("/holdings");
}

export async function updateTargetAction(formData: FormData) {
  const user = await requireUser();
  const totalInvestmentTarget = Math.max(
    0,
    parseNumber(formData.get("totalInvestmentTarget")),
  );

  await prisma.portfolioSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, totalInvestmentTarget },
    update: { totalInvestmentTarget },
  });

  revalidatePath("/");
  revalidatePath("/holdings");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}
