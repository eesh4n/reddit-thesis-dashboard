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

export function sentimentWeight(
  postedAt: string,
  now: number = Date.now(),
  halfLifeDays: number = SENTIMENT_HALF_LIFE_DAYS,
): number {
  const ageDays = Math.max(0, (now - new Date(postedAt).getTime()) / (1000 * 60 * 60 * 24));
  return Math.pow(0.5, ageDays / halfLifeDays);
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

// How much recency+confidence-weighted evidence it takes to reach "half
// confident" in the Alpha Score below. Roughly: ~10 fresh, high-confidence
// theses gets you halfway to full saturation; a few dozen gets you close to
// the cap. Tune this constant, not the formula, if the score feels too
// twitchy or too damped in practice.
const ALPHA_EVIDENCE_HALF_SATURATION = 10;

// A single number that folds in direction, confidence, AND evidence volume —
// unlike a plain bull/bear percentage, which normalizes away sample size and
// makes "81% bullish across 3 theses" look identical to "81% bullish across
// 300 theses." One is noise, the other is signal; this score tells them
// apart.
//
// lean = weighted net / weighted total, same -1..1 conviction-per-thesis
// average the percentage uses. saturation = weighted total / (total + k),
// which is ~0 for a handful of theses and approaches 1 as evidence piles up.
// Multiplying the two means a strong, one-sided lean on thin evidence stays
// muted near 0, and only swings toward ±100 when there's real weight behind
// it — fresh, confident, and lopsided all at once.
export function computeAlphaScore(
  theses: { sentiment: "bullish" | "bearish" | "neutral"; confidence: number; postedAt: string }[],
): number {
  const now = Date.now();
  let net = 0;
  let total = 0;
  for (const t of theses) {
    const w = sentimentWeight(t.postedAt, now) * t.confidence;
    total += w;
    if (t.sentiment === "bullish") net += w;
    else if (t.sentiment === "bearish") net -= w;
  }
  if (total === 0) return 0;
  const lean = net / total;
  const saturation = total / (total + ALPHA_EVIDENCE_HALF_SATURATION);
  return Math.round(lean * saturation * 100);
}

const ALERT_MIN_BEARISH = 2; // at least this many bearish theses in the window
const ALERT_WINDOW_HOURS = 24;

// Early warning for a stock you own: 2+ bearish theses posted in the last
// 24h and bears outnumbering bulls in that window. Recency is the point —
// the overall meter can still look fine while today's posts turn negative.
// Shared so the sidebar bell, the holdings card, and the alerts page all
// agree on what counts as "worth flagging."
export function hasBearishAlert(theses: { sentiment: ThesisView["sentiment"]; postedAt: string }[]): boolean {
  const cutoff = Date.now() - ALERT_WINDOW_HOURS * 60 * 60 * 1000;
  let bull = 0;
  let bear = 0;
  for (const t of theses) {
    if (new Date(t.postedAt).getTime() < cutoff) continue;
    if (t.sentiment === "bullish") bull++;
    else if (t.sentiment === "bearish") bear++;
  }
  return bear >= ALERT_MIN_BEARISH && bear > bull;
}

export type SentimentPoint = { date: string; net: number; total: number };
export type PricePoint = { date: string; close: number };

// Markets are closed weekends/holidays, sentiment isn't — forward-fill the
// last known close onto every sentiment-series date so the two can be
// compared point-for-point. Shared by the sparkline overlay and divergence
// detection so they can never disagree about what price applied on a given
// day.
export function forwardFillPrices(points: SentimentPoint[], pricePoints: PricePoint[]): number[] {
  const closeByDate = new Map(pricePoints.map((p) => [p.date, p.close]));
  let lastKnown = pricePoints[0].close;
  return points.map((p) => {
    const close = closeByDate.get(p.date);
    if (close != null) lastKnown = close;
    return lastKnown;
  });
}

const DIVERGENCE_WINDOW_DAYS = 5; // "several days" — long enough to filter single-day noise
const DIVERGENCE_MIN_PRICE_MOVE_PCT = 1.5;
const DIVERGENCE_MIN_SENTIMENT_NET = 2; // at least this much net bull/bear lean over the window

export type Divergence = {
  direction: "priceUpSentimentDown" | "priceDownSentimentUp";
  priceChangePct: number;
  sentimentNet: number;
} | null;

// "Is the crowd wrong or early?" — flags when price and Reddit sentiment
// have moved in opposite directions over the last several days. Both sides
// need a real move (not noise): the price change must clear a minimum
// percentage, and the sentiment lean must clear a minimum net bull/bear
// count over the same window, before this fires.
export function detectDivergence(points: SentimentPoint[], pricePoints: PricePoint[] | null | undefined): Divergence {
  if (!pricePoints || pricePoints.length < 2 || points.length < DIVERGENCE_WINDOW_DAYS) return null;

  const filled = forwardFillPrices(points, pricePoints);
  const window = points.slice(-DIVERGENCE_WINDOW_DAYS);
  const priceStart = filled[filled.length - DIVERGENCE_WINDOW_DAYS];
  const priceEnd = filled[filled.length - 1];
  if (!priceStart) return null;

  const priceChangePct = ((priceEnd - priceStart) / priceStart) * 100;
  const sentimentNet = window.reduce((sum, p) => sum + p.net, 0);

  if (priceChangePct >= DIVERGENCE_MIN_PRICE_MOVE_PCT && sentimentNet <= -DIVERGENCE_MIN_SENTIMENT_NET) {
    return { direction: "priceUpSentimentDown", priceChangePct, sentimentNet };
  }
  if (priceChangePct <= -DIVERGENCE_MIN_PRICE_MOVE_PCT && sentimentNet >= DIVERGENCE_MIN_SENTIMENT_NET) {
    return { direction: "priceDownSentimentUp", priceChangePct, sentimentNet };
  }
  return null;
}
