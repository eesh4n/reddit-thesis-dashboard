import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { getThesesForTicker, getDailySentiment, getUserNotes, getUserFeedback } from "@/lib/queries";
import { getPriceInfo, getPriceHistory } from "@/lib/price";
import { getRelatedTickers } from "@/lib/related";
import { computeConsensusFromTheses, sentimentWeight } from "@/lib/view";
import SentimentMeter from "@/components/SentimentMeter";
import Sparkline from "@/components/Sparkline";
import RelatedTickers from "@/components/RelatedTickers";
import ThesisSortList, { type DetailThesis } from "@/components/ThesisSortList";

export const dynamic = "force-dynamic";

export default async function TickerDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const ticker = symbol.toUpperCase();
  const session = await auth(); // sign-in gate is disabled for now, so this may be null
  const [rows, trend, price, priceHistory, related] = await Promise.all([
    getThesesForTicker(ticker),
    getDailySentiment(ticker, 14),
    getPriceInfo(ticker),
    getPriceHistory(ticker, 14),
    getRelatedTickers(ticker),
  ]);

  if (rows.length === 0) notFound();

  // Guests still get their own notes/votes — middleware already guarantees
  // a guestId cookie is present for anyone who reached this page without a
  // real session, so a plain read (no cookie write) is enough here. Writing
  // the cookie only happens in /api/portfolio, /api/notes, /api/feedback —
  // real Route Handlers, where Next.js actually allows it.
  const jar = await cookies();
  const userId = session?.user?.id ?? jar.get("guestId")?.value;
  const [notes, feedback] = userId
    ? await Promise.all([
        getUserNotes(userId, rows.map((r) => r.id)),
        getUserFeedback(userId, rows.map((r) => r.id)),
      ])
    : [{}, {}];

  const theses: DetailThesis[] = rows.map((r) => ({
    id: r.id,
    summary: r.summary,
    reasoning: r.reasoning,
    sentiment: r.sentiment as DetailThesis["sentiment"],
    confidence: r.confidence,
    extractedAt: r.extractedAt.toISOString(),
    postedAt: r.rawPost.postedAt.toISOString(),
    permalink: r.rawPost.permalink,
    subreddit: r.rawPost.subreddit,
    author: r.rawPost.author,
    note: notes[r.id] ?? "",
    vote: feedback[r.id] ?? null,
  }));

  // Age-weighted so a week-old bearish thread doesn't cancel out this
  // morning's bullish posts one-for-one — see sentimentWeight.
  let bullW = 0;
  let bearW = 0;
  let neutralW = 0;
  for (const t of theses) {
    const w = sentimentWeight(t.postedAt);
    if (t.sentiment === "bullish") bullW += w;
    else if (t.sentiment === "bearish") bearW += w;
    else neutralW += w;
  }
  const bull = Math.round(bullW);
  const bear = Math.round(bearW);
  const neutral = Math.round(neutralW);

  const consensus = computeConsensusFromTheses(theses);

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
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-accent">Ticker briefing</p>
            <div className="flex items-center gap-3.5">
              <h1 className="font-mono text-[48px] font-extrabold leading-none tracking-tight">{ticker}</h1>
              {consensus && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider ${consensus === "bullish" ? "bg-bull-dim text-bull" : "bg-bear-dim text-bear"}`}
                >
                  <Users size={12} /> {consensus} consensus
                </span>
              )}
            </div>
            {price && (
              <p className="mt-2.5 font-mono text-[15px] font-semibold">
                ${price.last.toFixed(2)}{" "}
                <span className={price.changePct5d >= 0 ? "text-bull" : "text-bear"}>
                  {price.changePct5d >= 0 ? "+" : ""}
                  {price.changePct5d.toFixed(1)}%
                </span>{" "}
                <span className="text-[11px] font-normal text-faint">5d</span>
              </p>
            )}
          </div>
          <div className="min-w-56 text-right max-md:text-left">
            <p className="mb-2 text-[10.5px] uppercase tracking-[0.16em] text-faint">Sentiment split</p>
            <SentimentMeter bull={bull} bear={bear} neutral={neutral} />
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-[10.5px] uppercase tracking-[0.16em] text-faint">14-day sentiment trend vs price</p>
          <Sparkline points={trend} pricePoints={priceHistory} />
        </div>
      </header>

      <RelatedTickers related={related} />

      <ThesisSortList theses={theses} />
    </div>
  );
}
