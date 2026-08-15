/**
 * Admin-only: grant someone access.
 *
 *   npm run user:add -- "Musab"                 # generates a passphrase
 *   npm run user:add -- "Musab" "their-phrase"  # sets a specific one
 *
 * This is a CLI script rather than a UI form on purpose: a signup form is a
 * public entry point, and this app is meant to be allowlist-only. Adding a
 * user also seeds their portfolio so they land on a working dashboard.
 */
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_TOTAL_INVESTMENT_TARGET } from "../src/lib/seed-data";

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

/** Readable passphrase — easier to type on a phone than a hex blob. */
function generatePassphrase(): string {
  return randomBytes(9).toString("base64url");
}

async function main() {
  const [name, providedPassphrase] = process.argv.slice(2);

  if (!name) {
    console.error('Usage: npm run user:add -- "<name>" [passphrase]');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { name } });
  if (existing) {
    console.error(`User "${name}" already exists. Use user:reset to change their passphrase.`);
    process.exit(1);
  }

  const passphrase = providedPassphrase || generatePassphrase();

  // No holdings: portfolios are personal, so a new user starts empty and adds
  // their own picks through the app's stock search.
  const user = await prisma.user.create({
    data: {
      name,
      passphraseHash: await bcrypt.hash(passphrase, BCRYPT_ROUNDS),
      settings: {
        create: { totalInvestmentTarget: DEFAULT_TOTAL_INVESTMENT_TARGET },
      },
    },
  });

  console.log(`\n  Created user "${user.name}"`);
  console.log(`  Passphrase: ${passphrase}`);
  console.log("  Portfolio starts empty — they add holdings in the app.\n");
  console.log("  Give them the passphrase now — it is hashed and cannot be read back.\n");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
