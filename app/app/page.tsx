import { getAllTheses } from "@/lib/queries";
import Sidebar from "@/components/Sidebar";
import SentimentMeter from "@/components/SentimentMeter";
import TickerCard from "@/components/TickerCard";
import TrendingRow from "@/components/TrendingRow";
import AddTickerForm from "@/components/AddTickerForm";
import { aggregateByTicker, type ThesisView, type TickerAgg } from "@/lib/view";
import { MOCK_HOLDINGS, MOCK_WATCHLIST } from "@/lib/mock-data";

export const dynamic = "force-dynamic"; // always read fresh from the db

export default async function Home() {
  const rows = await getAllTheses(); // your query — real theses from Postgres

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

  const byTicker = aggregateByTicker(theses);

  const totals = { bull: 0, bear: 0, neutral: 0 };
  for (const t of theses) {
    if (t.sentiment === "bullish") totals.bull++;
    else if (t.sentiment === "bearish") totals.bear++;
    else totals.neutral++;
  }

  const emptyAgg = (ticker: string): TickerAgg =>
    byTicker.get(ticker) ?? { ticker, bull: 0, bear: 0, neutral: 0, theses: [] };

  // TODO(you): MOCK_HOLDINGS / MOCK_WATCHLIST become localStorage-backed
  // client state — see lib/mock-data.ts for the plan.
  const trending = [...byTicker.values()]
    .filter((a) => !MOCK_HOLDINGS.includes(a.ticker) && !MOCK_WATCHLIST.includes(a.ticker))
    .sort((a, b) => b.theses.length - a.theses.length)
    .slice(0, 8);

  return (
    <div className="grid min-h-screen grid-cols-[248px_1fr] max-md:grid-cols-1">
      <Sidebar thesisCount={theses.length} />

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

        {/* ── Holdings ── */}
        <section id="holdings" className="px-11 pt-10 max-md:px-6">
          <div className="mb-5 flex items-baseline gap-3.5">
            <h2 className="font-display text-lg font-semibold tracking-tight">Your Holdings</h2>
            <span className="ml-auto text-xs text-faint">Stocks you own · sentiment & latest theses</span>
          </div>
          <AddTickerForm placeholder="Add a holding, e.g. NVDA" />
          <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
            {MOCK_HOLDINGS.map((t) => (
              <TickerCard key={t} agg={emptyAgg(t)} />
            ))}
          </div>
        </section>

        {/* ── Trending ── */}
        <section id="trending" className="px-11 pt-12 max-md:px-6">
          <div className="mb-5 flex items-baseline gap-3.5">
            <h2 className="font-display text-lg font-semibold tracking-tight">Trending New Ideas</h2>
            <span className="ml-auto text-xs text-faint">Most-discussed tickers you don&apos;t hold yet</span>
          </div>
          <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-edge bg-edge-soft">
            {trending.map((a, i) => (
              <TrendingRow key={a.ticker} agg={a} rank={i + 1} />
            ))}
          </div>
        </section>

        {/* ── Watchlist ── */}
        <section id="watchlist" className="px-11 pt-12 max-md:px-6">
          <div className="mb-5 flex items-baseline gap-3.5">
            <h2 className="font-display text-lg font-semibold tracking-tight">Watchlist</h2>
            <span className="ml-auto text-xs text-faint">Ideas you&apos;re tracking</span>
          </div>
          <AddTickerForm placeholder="Add to watchlist, e.g. TSLA" />
          {MOCK_WATCHLIST.length === 0 ? (
            <div className="rounded-xl border border-dashed border-edge p-8 text-center text-[13px] text-faint">
              Your watchlist is empty. Add a trending idea above to follow its sentiment.
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
              {MOCK_WATCHLIST.map((t) => (
                <TickerCard key={t} agg={emptyAgg(t)} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
