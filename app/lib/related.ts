import { prisma } from "@/lib/db";

// Generic finance/Reddit vocabulary that would otherwise dominate every
// ticker's keyword set and drown out the actually-distinctive shared terms
// (e.g. "AI bubble", "memory supercycle", "circular revenue").
const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "have", "has", "are", "was", "were", "been",
  "stock", "stocks", "price", "prices", "market", "markets", "company", "companies", "share", "shares",
  "will", "would", "could", "should", "their", "they", "them", "its", "about", "into", "over", "under",
  "than", "then", "also", "just", "some", "more", "most", "very", "much", "many", "which", "what", "when",
  "buy", "sell", "bull", "bear", "bullish", "bearish", "thesis", "reasoning", "poster", "argues", "believes",
  "post", "posted", "reddit", "subreddit", "ticker", "target", "based", "given", "citing", "cites",
  "here", "there", "your", "you're", "have", "does", "doing", "make", "makes", "made", "still", "even",
]);

function keywordsOf(text: string): Set<string> {
  const words = text.toLowerCase().match(/[a-z]{4,}/g) ?? [];
  return new Set(words.filter((w) => !STOPWORDS.has(w)));
}

export type RelatedTicker = { ticker: string; sharedTerms: string[]; score: number };

// Finds tickers whose recent theses share meaningful vocabulary with this
// ticker's theses — no sector/industry data anywhere in the schema, so this
// is the cheap alternative: if MU, SK Hynix, and Samsung theses all mention
// "memory supercycle" and "HBM demand," that's a real signal worth surfacing
// even though nothing formally links the three tickers.
export async function getRelatedTickers(ticker: string, days = 30, limit = 5): Promise<RelatedTicker[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await prisma.thesis.findMany({
    where: { extractedAt: { gte: since } },
    select: { ticker: true, summary: true, reasoning: true },
  });

  const byTicker = new Map<string, Set<string>>();
  for (const r of rows) {
    const kws = keywordsOf(`${r.summary} ${r.reasoning}`);
    const existing = byTicker.get(r.ticker) ?? new Set<string>();
    for (const k of kws) existing.add(k);
    byTicker.set(r.ticker, existing);
  }

  const targetTicker = ticker.toUpperCase();
  const target = byTicker.get(targetTicker);
  if (!target || target.size === 0) return [];

  const results: RelatedTicker[] = [];
  for (const [otherTicker, kws] of byTicker) {
    if (otherTicker === targetTicker) continue;
    const shared = [...target].filter((k) => kws.has(k));
    // Require at least 2 shared meaningful terms — 1 shared word is too easy
    // to hit by coincidence across unrelated theses.
    if (shared.length >= 2) {
      results.push({ ticker: otherTicker, sharedTerms: shared.slice(0, 4), score: shared.length });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
