import { PrismaClient } from "@prisma/client";

// Prisma v5 — singleton pattern สำหรับ Next.js
// ป้องกัน connection pool ล้นตอน hot-reload ใน dev mode

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}