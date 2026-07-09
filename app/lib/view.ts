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
};

export type TickerAgg = {
  ticker: string;
  bull: number;
  bear: number;
  neutral: number;
  theses: ThesisView[];
};

// Groups theses by ticker and counts sentiment — display shaping for the meter.
export function aggregateByTicker(theses: ThesisView[]): Map<string, TickerAgg> {
  const map = new Map<string, TickerAgg>();
  for (const t of theses) {
    const agg = map.get(t.ticker) ?? { ticker: t.ticker, bull: 0, bear: 0, neutral: 0, theses: [] };
    agg.theses.push(t);
    if (t.sentiment === "bullish") agg.bull++;
    else if (t.sentiment === "bearish") agg.bear++;
    else agg.neutral++;
    map.set(t.ticker, agg);
  }
  return map;
}
