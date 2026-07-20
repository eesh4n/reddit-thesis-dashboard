import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { getAllTheses, getDailySentiment, getTickerSnapshot } from "@/lib/queries";
import { getPriceInfo, getPriceHistory } from "@/lib/price";
import { aggregateByTicker, computeConsensusFromTheses, sentimentWeight, type ThesisView } from "@/lib/view";
import ComparePicker from "@/components/ComparePicker";
import Sparkline from "@/components/Sparkline";
import SentimentMeter from "@/components/SentimentMeter";

export const dynamic = "force-dynamic";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ tickers?: string }>;
}) {
  const { tickers: rawTickers } = await searchParams;
  const selected = (rawTickers ?? "")
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 3);

  const rows = await getAllTheses(30);
  const theses: ThesisView[] = rows.map((r) => ({
    id: r.id,
    ticker: r.ticker,
    summary: r.summary,
    reasoning: r.reasoning,
    sentiment: r.sentiment as ThesisView["sentiment"],
    confidence: r.confidence,
    permalink: r.rawPost.permalink,
    postedAt: r.rawPost.postedAt.toISOString(),
    author: r.rawPost.author,
  }));
  const knownTickers = [...aggregateByTicker(theses).keys()].sort();

  const cards = await Promise.all(
    selected.map(async (ticker) => {
      const [snapshot, trend, price, priceHistory] = await Promise.all([
        getTickerSnapshot(ticker, 30),
        getDailySentiment(ticker, 14),
        getPriceInfo(ticker),
        getPriceHistory(ticker, 14),
      ]);

      let bullW = 0;
      let bearW = 0;
      let neutralW = 0;
      for (const t of snapshot) {
        const w = sentimentWeight(t.rawPost.postedAt.toISOString());
        if (t.sentiment === "bullish") bullW += w;
        else if (t.sentiment === "bearish") bearW += w;
        else neutralW += w;
      }

      const consensus = computeConsensusFromTheses(
        snapshot.map((t) => ({ sentiment: t.sentiment as "bullish" | "bearish" | "neutral", author: t.rawPost.author })),
      );

      return {
        ticker,
        total: snapshot.length,
        bull: Math.round(bullW),
        bear: Math.round(bearW),
        neutral: Math.round(neutralW),
        consensus,
        trend,
        price,
        priceHistory,
      };
    }),
  );

  return (
    <div className="mx-auto max-w-6xl px-6 pb-20 pt-9 md:px-11">
      <Link
        href="/"
        className="mb-8 inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-mute transition-colors duration-150 hover:text-fg"
      >
        <ArrowLeft size={14} /> Back to dashboard
      </Link>

      <header className="mb-7 border-b border-edge-soft pb-7">
        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Compare</p>
        <h1 className="mb-5 font-display text-[32px] font-bold leading-tight tracking-tight">
          Sentiment side by side
        </h1>
        <ComparePicker knownTickers={knownTickers} selected={selected} />
      </header>

      {cards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-edge p-10 text-center text-[13px] text-faint">
          Add up to 3 tickers above to compare their sentiment trends.
        </div>
      ) : (
        <div className={`grid gap-5 ${cards.length === 1 ? "grid-cols-1 max-w-md" : cards.length === 2 ? "grid-cols-2 max-lg:grid-cols-1" : "grid-cols-3 max-lg:grid-cols-1"}`}>
          {cards.map((c) => (
            <div key={c.ticker} className="rounded-2xl border border-edge bg-panel p-5">
              <div className="mb-4 flex items-center gap-2.5">
                <Link
                  href={`/ticker/${c.ticker}`}
                  className="font-mono text-xl font-extrabold tracking-tight transition-colors duration-150 hover:text-gold"
                >
                  {c.ticker}
                </Link>
                {c.consensus && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${c.consensus === "bullish" ? "bg-bull-dim text-bull" : "bg-bear-dim text-bear"}`}
                  >
                    <Users size={10} /> {c.consensus}
                  </span>
                )}
                {c.price && (
                  <span className="ml-auto font-mono text-[13px] font-semibold">
                    ${c.price.last.toFixed(2)}{" "}
                    <span className={c.price.changePct5d >= 0 ? "text-bull" : "text-bear"}>
                      {c.price.changePct5d >= 0 ? "+" : ""}
                      {c.price.changePct5d.toFixed(1)}%
                    </span>
                  </span>
                )}
              </div>

              {c.total === 0 ? (
                <div className="rounded-lg border border-dashed border-edge p-6 text-center text-[12px] text-faint">
                  No theses for {c.ticker} in the last 30 days.
                </div>
              ) : (
                <>
                  <p className="mb-3 text-[11px] text-faint">{c.total} theses, last 30 days</p>
                  <SentimentMeter bull={c.bull} bear={c.bear} neutral={c.neutral} compact />
                  <div className="mt-4">
                    <p className="mb-2 text-[10.5px] uppercase tracking-[0.16em] text-faint">14-day trend</p>
                    <Sparkline points={c.trend} pricePoints={c.priceHistory} />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
