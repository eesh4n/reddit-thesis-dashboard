import { prisma } from "@/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;

export type DigestTicker = {
  ticker: string;
  todayCount: number;
};

export type Digest = {
  newTrending: DigestTicker[]; // discussed today, silent the day before
};

// Compares the last 24h of theses against the 24h before that, per ticker.
// Windowed on the Reddit post's own postedAt, not extractedAt — batched,
// priority-ordered extraction can analyze a days-old post today, which made
// "new today" claims feel stale when they were actually keyed off scrape
// time rather than when the post went up.
export async function getDigest(): Promise<Digest> {
  const now = Date.now();
  const since = new Date(now - 2 * DAY_MS);

  const rows = await prisma.thesis.findMany({
    where: { rawPost: { postedAt: { gte: since } } },
    select: { ticker: true, rawPost: { select: { postedAt: true } } },
  });

  const cutoffToday = new Date(now - DAY_MS);
  const counts = new Map<string, { today: number; yesterday: number }>();

  for (const r of rows) {
    const isToday = r.rawPost.postedAt >= cutoffToday;
    const entry = counts.get(r.ticker) ?? { today: 0, yesterday: 0 };
    if (isToday) entry.today++;
    else entry.yesterday++;
    counts.set(r.ticker, entry);
  }

  const newTrending = [...counts.entries()]
    .filter(([, c]) => c.today > 0 && c.yesterday === 0)
    .map(([ticker, c]) => ({ ticker, todayCount: c.today }))
    .sort((a, b) => b.todayCount - a.todayCount)
    .slice(0, 10);

  return { newTrending };
}
