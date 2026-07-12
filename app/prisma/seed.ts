import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config();

// Prisma 7 connects through a driver adapter, same as lib/db.ts.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const subreddits = ["wallstreetbets", "stocks", "investing", "options", "SecurityAnalysis"];
  for (const name of subreddits) {
    await prisma.subredditSource.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("Seeded 5 subreddits");
}

main().then(() => prisma.$disconnect());
