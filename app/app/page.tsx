import { auth } from "@/lib/auth";
import { getAllTheses, getTopConvictionToday, getBacklogCount } from "@/lib/queries";
import { getDigest } from "@/lib/digest";
import Sidebar from "@/components/Sidebar";
import SentimentMeter from "@/components/SentimentMeter";
import DashboardSections from "@/components/DashboardSections";
import DigestPanel from "@/components/DigestPanel";
import TopConviction, { type ConvictionThesis } from "@/components/TopConviction";
import { aggregateByTicker, sentimentWeight, type ThesisView } from "@/lib/view";

export const dynamic = "force-dynamic"; // always read fresh from the db

export default async function Home() {
  const session = await auth(); // middleware already guarantees this exists here
  const [rows, digest, convictionResult, backlogCount] = await Promise.all([
    getAllTheses(),
    getDigest(),
    getTopConvictionToday(),
    getBacklogCount(),
  ]);
  const { rows: convictionRows, windowHours: convictionWindowHours } = convictionResult;

  const conviction: ConvictionThesis[] = convictionRows.map((r) => ({
    id: r.id,
    ticker: r.ticker,
    summary: r.summary,
    reasoning: r.reasoning,
    sentiment: r.sentiment as ConvictionThesis["sentiment"],
    confidence: r.confidence,
    permalink: r.rawPost.permalink,
    subreddit: r.rawPost.subreddit,
  }));

  // Map DB rows to the UI shape (flatten rawPost.permalink, narrow sentiment).
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

  const aggs = [...aggregateByTicker(theses).values()];

  // Age-weighted so a week-old bearish thread doesn't cancel out this
  // morning's bullish posts one-for-one — see sentimentWeight.
  const weighted = { bull: 0, bear: 0, neutral: 0 };
  for (const t of theses) {
    const w = sentimentWeight(t.postedAt);
    if (t.sentiment === "bullish") weighted.bull += w;
    else if (t.sentiment === "bearish") weighted.bear += w;
    else weighted.neutral += w;
  }
  const totals = { bull: Math.round(weighted.bull), bear: Math.round(weighted.bear), neutral: Math.round(weighted.neutral) };
  const directional = weighted.bull + weighted.bear;
  const bullPct = directional > 0 ? Math.round((weighted.bull / directional) * 100) : 50;
  const isBullish = bullPct >= 50;

  return (
    <div className="grid min-h-screen grid-cols-[248px_1fr] max-md:grid-cols-1">
      <Sidebar
        thesisCount={theses.length}
        email={session?.user?.email}
        knownTickers={aggs.map((a) => a.ticker)}
        backlogCount={backlogCount}
      />

      <main className="mx-auto w-full max-w-[1600px] pb-20">
        {/* ── Briefing header — big bold number is the hero moment ── */}
        <header className="flex items-end justify-between gap-8 border-b border-edge-soft px-11 pb-8 pt-10 max-md:flex-col max-md:items-start max-md:px-6">
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Morning briefing</p>
            <h1 className="font-display text-[40px] font-bold leading-[1.02] tracking-tight max-md:text-[30px]">
              What Reddit is saying <span className="text-mute">about your book.</span>
            </h1>
          </div>
          <div className="min-w-64 text-right max-md:text-left">
            <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-faint">
              Aggregate sentiment
            </p>
            <div className={`font-display text-[52px] font-bold leading-none tracking-tight ${isBullish ? "text-bull" : "text-bear"}`}>
              {bullPct}<span className="text-3xl">%</span>
            </div>
            <p className="mb-3 text-[12px] font-semibold text-faint">bullish across {theses.length} theses</p>
            <SentimentMeter bull={totals.bull} bear={totals.bear} neutral={totals.neutral} />
          </div>
        </header>

        {/* "What changed since yesterday" — the actual morning-briefing payoff */}
        <DigestPanel digest={digest} />

        {/* Strongest ideas of the last day (or longer, on a quiet news day), regardless of ticker */}
        <TopConviction theses={conviction} windowHours={convictionWindowHours} />

        {/* Interactive sections (holdings / trending / watchlist) — client-side,
            holdings & watchlist are per-user rows in Postgres. */}
        <DashboardSections aggs={aggs} />
      </main>
    </div>
  );
}
