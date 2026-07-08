import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Reuse one PrismaClient across hot-reloads in dev instead of creating a new
// one on every request (which would exhaust database connections).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Prisma 7 connects through a driver adapter rather than a datasource URL.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
