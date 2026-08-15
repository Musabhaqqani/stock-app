import { PrismaClient } from "@prisma/client";

// Next's dev server reloads modules on every edit; without this the process
// accumulates one Prisma client (and connection pool) per reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
