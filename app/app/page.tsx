import { auth } from "@/lib/auth";
import { getAllTheses } from "@/lib/queries";
import { getDigest } from "@/lib/digest";
import Sidebar from "@/components/Sidebar";
import SentimentMeter from "@/components/SentimentMeter";
import DashboardSections from "@/components/DashboardSections";
import DigestPanel from "@/components/DigestPanel";
import { aggregateByTicker, type ThesisView } from "@/lib/view";

export const dynamic = "force-dynamic"; // always read fresh from the db

export default async function Home() {
  const session = await auth(); // middleware already guarantees this exists here
  const [rows, digest] = await Promise.all([getAllTheses(), getDigest()]);

  // Map DB rows to the UI shape (flatten rawPost.permalink, narrow sentiment).
  const theses: ThesisView[] = rows.map((r) => ({
    id: r.id,
    ticker: r.ticker,
    summary: r.summary,
    reasoning: r.reasoning,
    sentiment: r.sentiment as ThesisView["sentiment"],
    confidence: r.confidence,
    permalink: r.rawPost.permalink,
  }));

  const aggs = [...aggregateByTicker(theses).values()];

  const totals = { bull: 0, bear: 0, neutral: 0 };
  for (const t of theses) {
    if (t.sentiment === "bullish") totals.bull++;
    else if (t.sentiment === "bearish") totals.bear++;
    else totals.neutral++;
  }

  return (
    <div className="grid min-h-screen grid-cols-[248px_1fr] max-md:grid-cols-1">
      <Sidebar thesisCount={theses.length} email={session?.user?.email} />

      <main className="max-w-6xl pb-20">
        {/* ── Briefing header ── */}
        <header className="flex items-end justify-between gap-6 border-b border-edge-soft px-11 pb-7 pt-9 max-md:flex-col max-md:items-start max-md:px-6">
          <div>
            <p className="mb-2.5 text-[11px] uppercase tracking-[0.2em] text-gold">Morning briefing</p>
            <h1 className="font-display text-[34px] font-semibold leading-[1.05] tracking-tight">
              What Reddit is saying <span className="text-mute">about your book.</span>
            </h1>
          </div>
          <div className="min-w-56 text-right max-md:text-left">
            <p className="mb-2 text-[10.5px] uppercase tracking-[0.16em] text-faint">Aggregate sentiment</p>
            <SentimentMeter bull={totals.bull} bear={totals.bear} neutral={totals.neutral} />
          </div>
        </header>

        {/* "What changed since yesterday" — the actual morning-briefing payoff */}
        <DigestPanel digest={digest} />

        {/* Interactive sections (holdings / trending / watchlist) — client-side,
            holdings & watchlist are per-user rows in Postgres. */}
        <DashboardSections aggs={aggs} />
      </main>
    </div>
  );
}
