import { prisma } from "@/lib/db";

export type ThesisRow = {
  ticker: string;
  sentiment: string;
  confidence: number;
  summary: string;
  reasoning: string;
  permalink: string;
  extractedAt: Date;
};

// Every extracted thesis, newest first, with a link back to the source Reddit post.
export async function getAllTheses(): Promise<ThesisRow[]> {
  const rows = await prisma.thesis.findMany({
    orderBy: { extractedAt: "desc" },
    include: { rawPost: { select: { permalink: true } } },
  });
  return rows.map((r) => ({
    ticker: r.ticker,
    sentiment: r.sentiment,
    confidence: r.confidence,
    summary: r.summary,
    reasoning: r.reasoning,
    permalink: r.rawPost.permalink,
    extractedAt: r.extractedAt,
  }));
}

export type TrendingRow = { ticker: string; thesisCount: number; avgConfidence: number };

// Tickers with the most theses — the "what's being talked about" view.
export async function getTrendingTickers(): Promise<TrendingRow[]> {
  const rows = await prisma.thesis.groupBy({
    by: ["ticker"],
    _count: { ticker: true },
    _avg: { confidence: true },
    orderBy: { _count: { ticker: "desc" } },
    take: 20,
  });
  return rows.map((r) => ({
    ticker: r.ticker,
    thesisCount: r._count.ticker,
    avgConfidence: r._avg.confidence ?? 0,
  }));
}
