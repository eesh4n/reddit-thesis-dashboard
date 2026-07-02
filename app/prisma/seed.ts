import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

config();

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

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
