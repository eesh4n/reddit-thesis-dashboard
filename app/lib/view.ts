// UI-facing types and display helpers. No data fetching here —
// your queries (lib/queries.ts) return DB rows; the page maps them to these shapes.

export type ThesisView = {
  id: string;
  ticker: string;
  summary: string;
  reasoning: string;
  sentiment: "bullish" | "bearish" | "neutral";
  confidence: number; // 0..1
  permalink: string;
  postedAt: string; // ISO — when the Reddit post itself went up
  author: string; // Reddit username of the source post — used to dedupe consensus
};

export type TickerAgg = {
  ticker: string;
  bull: number;
  bear: number;
  neutral: number;
  theses: ThesisView[];
  consensus: "bullish" | "bearish" | null; // 3+ independent AUTHORS agreeing, one side dominant
};

const CONSENSUS_MIN_COUNT = 3; // at least this many independent authors on the dominant side
const CONSENSUS_MIN_RATIO = 2; // and that side must outnumber the other by this much

// A week-old bearish thread shouldn't cancel out this morning's bullish
// posts one-for-one — exponential decay by the Reddit post's own age, half
// weight every 7 days. Asymptotic (never hits exactly 0), so very old posts
// still register a faint signal rather than vanishing outright.
const SENTIMENT_HALF_LIFE_DAYS = 7;

export function sentimentWeight(postedAt: string, now: number = Date.now()): number {
  const ageDays = Math.max(0, (now - new Date(postedAt).getTime()) / (1000 * 60 * 60 * 24));
  return Math.pow(0.5, ageDays / SENTIMENT_HALF_LIFE_DAYS);
}

// Exported so every place that decides "does this ticker have consensus"
// (dashboard cards, trending rows, the ticker detail page) uses the exact
// same rule. Two copies of this threshold logic already drifted into being
// duplicated once — don't let it happen again.
export function computeConsensus(bull: number, bear: number): "bullish" | "bearish" | null {
  if (bull >= CONSENSUS_MIN_COUNT && bull >= bear * CONSENSUS_MIN_RATIO) return "bullish";
  if (bear >= CONSENSUS_MIN_COUNT && bear >= bull * CONSENSUS_MIN_RATIO) return "bearish";
  return null;
}

// Consensus should mean "independent people agree," not "one person posted
// the same take five times across five subreddits." Dedupe by author within
// each sentiment side before applying the threshold — a prolific poster no
// longer manufactures a false consensus signal on their own.
export function computeConsensusFromTheses(
  theses: { sentiment: "bullish" | "bearish" | "neutral"; author: string }[],
): "bullish" | "bearish" | null {
  const bullAuthors = new Set(theses.filter((t) => t.sentiment === "bullish").map((t) => t.author));
  const bearAuthors = new Set(theses.filter((t) => t.sentiment === "bearish").map((t) => t.author));
  return computeConsensus(bullAuthors.size, bearAuthors.size);
}

// Groups theses by ticker and weighs sentiment by recency — display shaping
// for the meter. bull/bear/neutral are age-weighted sums (see
// sentimentWeight), rounded to one decimal since they're no longer plain
// counts; theses.length elsewhere still gives the true, unweighted "how much
// discussion" total. Consensus is computed separately with author-dedup
// applied so a single loud poster can't manufacture it.
export function aggregateByTicker(theses: ThesisView[]): Map<string, TickerAgg> {
  const map = new Map<string, Omit<TickerAgg, "consensus">>();
  const now = Date.now();
  for (const t of theses) {
    const agg = map.get(t.ticker) ?? { ticker: t.ticker, bull: 0, bear: 0, neutral: 0, theses: [] };
    agg.theses.push(t);
    const w = sentimentWeight(t.postedAt, now);
    if (t.sentiment === "bullish") agg.bull += w;
    else if (t.sentiment === "bearish") agg.bear += w;
    else agg.neutral += w;
    map.set(t.ticker, agg);
  }
  const out = new Map<string, TickerAgg>();
  for (const [ticker, agg] of map) {
    out.set(ticker, {
      ...agg,
      bull: Math.round(agg.bull),
      bear: Math.round(agg.bear),
      neutral: Math.round(agg.neutral),
      consensus: computeConsensusFromTheses(agg.theses),
    });
  }
  return out;
}
