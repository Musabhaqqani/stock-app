import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma's client is CJS and pulls in native engine files; keep it out of
  // the server bundle so it resolves at runtime instead.
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
