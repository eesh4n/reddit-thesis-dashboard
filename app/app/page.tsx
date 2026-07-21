import { auth } from "@/lib/auth";
import { getAllTheses, getTopConvictionToday, getBacklogCount } from "@/lib/queries";
import { getDigest } from "@/lib/digest";
import Sidebar from "@/components/Sidebar";
import DashboardSections from "@/components/DashboardSections";
import DigestPanel from "@/components/DigestPanel";
import TopConviction, { type ConvictionThesis } from "@/components/TopConviction";
import { aggregateByTicker, type ThesisView } from "@/lib/view";

export const dynamic = "force-dynamic"; // always read fresh from the db

export default async function Home() {
  const session = await auth(); // middleware already guarantees this exists here
  const [rows, digest, convictionResult, backlogCount] = await Promise.all([
    getAllTheses(),
    getDigest(),
    getTopConvictionToday(),
    getBacklogCount(),
  ]);

  const conviction: ConvictionThesis[] = convictionResult.rows.map((r) => ({
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

  return (
    <div className="grid min-h-screen grid-cols-[248px_1fr] max-md:grid-cols-1">
      <Sidebar
        thesisCount={theses.length}
        email={session?.user?.email}
        knownTickers={aggs.map((a) => a.ticker)}
        backlogCount={backlogCount}
        aggs={aggs}
      />

      <main className="mx-auto w-full max-w-[1600px] pb-20">
        {/* ── Briefing header — no market-wide score here anymore; that
            told you nothing about your book. Aggregate sentiment now lives
            scoped to Holdings and Watchlist in DashboardSections. ── */}
        <header className="border-b border-edge-soft px-11 pb-8 pt-10 max-md:px-6">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-accent">Morning briefing</p>
          <h1 className="font-display text-[40px] font-bold leading-[1.02] tracking-tight max-md:text-[30px]">
            What Reddit is saying <span className="text-mute">about your book.</span>
          </h1>
        </header>

        {/* "What changed since yesterday" — the actual morning-briefing payoff */}
        <DigestPanel digest={digest} />

        {/* Strongest ideas right now, regardless of ticker — constantly re-ranked, not stuck on a fixed window */}
        <TopConviction theses={conviction} />

        {/* Interactive sections (holdings / trending / watchlist) — client-side,
            holdings & watchlist are per-user rows in Postgres. Each of
            Holdings/Watchlist gets its own Alpha Score, scoped to just
            that list's theses. */}
        <DashboardSections aggs={aggs} />
      </main>
    </div>
  );
}
