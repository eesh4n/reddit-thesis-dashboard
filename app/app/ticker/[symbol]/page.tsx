import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { getThesesForTicker, getDailySentiment } from "@/lib/queries";
import SentimentMeter from "@/components/SentimentMeter";
import Sparkline from "@/components/Sparkline";
import ThesisSortList, { type DetailThesis } from "@/components/ThesisSortList";

export const dynamic = "force-dynamic";

const CONSENSUS_MIN_COUNT = 3;
const CONSENSUS_MIN_RATIO = 2;

export default async function TickerDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const ticker = symbol.toUpperCase();
  const [rows, trend] = await Promise.all([getThesesForTicker(ticker), getDailySentiment(ticker, 14)]);

  if (rows.length === 0) notFound();

  const theses: DetailThesis[] = rows.map((r) => ({
    id: r.id,
    summary: r.summary,
    reasoning: r.reasoning,
    sentiment: r.sentiment as DetailThesis["sentiment"],
    confidence: r.confidence,
    extractedAt: r.extractedAt.toISOString(),
    permalink: r.rawPost.permalink,
    subreddit: r.rawPost.subreddit,
  }));

  const bull = theses.filter((t) => t.sentiment === "bullish").length;
  const bear = theses.filter((t) => t.sentiment === "bearish").length;
  const neutral = theses.length - bull - bear;

  const consensus =
    bull >= CONSENSUS_MIN_COUNT && bull >= bear * CONSENSUS_MIN_RATIO
      ? "bullish"
      : bear >= CONSENSUS_MIN_COUNT && bear >= bull * CONSENSUS_MIN_RATIO
        ? "bearish"
        : null;

  return (
    <div className="mx-auto max-w-3xl px-6 pb-20 pt-9 md:px-11">
      <Link
        href="/"
        className="mb-8 inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-mute transition-colors duration-150 hover:text-fg"
      >
        <ArrowLeft size={14} /> Back to dashboard
      </Link>

      <header className="mb-9 border-b border-edge-soft pb-7">
        <div className="flex items-end justify-between gap-6 max-md:flex-col max-md:items-start">
          <div>
            <p className="mb-2.5 text-[11px] uppercase tracking-[0.2em] text-gold">Ticker briefing</p>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-[36px] font-semibold leading-none tracking-tight">{ticker}</h1>
              {consensus && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider ${consensus === "bullish" ? "bg-bull-dim text-bull" : "bg-bear-dim text-bear"}`}
                >
                  <Users size={12} /> {consensus} consensus
                </span>
              )}
            </div>
          </div>
          <div className="min-w-56 text-right max-md:text-left">
            <p className="mb-2 text-[10.5px] uppercase tracking-[0.16em] text-faint">Sentiment split</p>
            <SentimentMeter bull={bull} bear={bear} neutral={neutral} />
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-[10.5px] uppercase tracking-[0.16em] text-faint">14-day sentiment trend</p>
          <Sparkline points={trend} />
        </div>
      </header>

      <ThesisSortList theses={theses} />
    </div>
  );
}
