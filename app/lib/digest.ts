import { prisma } from "@/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;

export type DigestTicker = {
  ticker: string;
  todayCount: number;
  yesterdayCount: number;
  todayNet: number; // bull - bear, today's window
  yesterdayNet: number;
};

export type Digest = {
  newTrending: DigestTicker[]; // discussed today, silent the day before
  sentimentFlips: (DigestTicker & { from: "bullish" | "bearish"; to: "bullish" | "bearish" })[];
  volumeSpikes: DigestTicker[]; // meaningfully more discussion today than yesterday
};

// Compares the last 24h of theses against the 24h before that, per ticker.
// Pure aggregation in JS — the dataset (a few days of theses) is small
// enough that a raw SQL rollup isn't worth the complexity.
export async function getDigest(): Promise<Digest> {
  const now = Date.now();
  const since = new Date(now - 2 * DAY_MS);

  const rows = await prisma.thesis.findMany({
    where: { extractedAt: { gte: since } },
    select: { ticker: true, sentiment: true, extractedAt: true },
  });

  const cutoffToday = new Date(now - DAY_MS);
  const byTicker = new Map<string, DigestTicker>();

  for (const r of rows) {
    const isToday = r.extractedAt >= cutoffToday;
    const entry = byTicker.get(r.ticker) ?? {
      ticker: r.ticker,
      todayCount: 0,
      yesterdayCount: 0,
      todayNet: 0,
      yesterdayNet: 0,
    };
    const delta = r.sentiment === "bullish" ? 1 : r.sentiment === "bearish" ? -1 : 0;
    if (isToday) {
      entry.todayCount++;
      entry.todayNet += delta;
    } else {
      entry.yesterdayCount++;
      entry.yesterdayNet += delta;
    }
    byTicker.set(r.ticker, entry);
  }

  const all = [...byTicker.values()];

  const newTrending = all
    .filter((t) => t.todayCount > 0 && t.yesterdayCount === 0)
    .sort((a, b) => b.todayCount - a.todayCount)
    .slice(0, 10);

  const sentimentFlips = all
    .filter((t) => t.todayCount > 0 && t.yesterdayCount > 0)
    .filter((t) => Math.sign(t.todayNet) !== 0 && Math.sign(t.yesterdayNet) !== 0)
    .filter((t) => Math.sign(t.todayNet) !== Math.sign(t.yesterdayNet))
    .map((t) => ({
      ...t,
      from: (t.yesterdayNet > 0 ? "bullish" : "bearish") as "bullish" | "bearish",
      to: (t.todayNet > 0 ? "bullish" : "bearish") as "bullish" | "bearish",
    }))
    .sort((a, b) => Math.abs(b.todayNet - b.yesterdayNet) - Math.abs(a.todayNet - a.yesterdayNet))
    .slice(0, 10);

  const volumeSpikes = all
    .filter((t) => t.yesterdayCount > 0 && t.todayCount >= t.yesterdayCount * 2 && t.todayCount - t.yesterdayCount >= 2)
    .sort((a, b) => b.todayCount - b.yesterdayCount - (a.todayCount - a.yesterdayCount))
    .slice(0, 10);

  return { newTrending, sentimentFlips, volumeSpikes };
}
