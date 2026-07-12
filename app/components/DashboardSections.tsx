"use client";

import TickerCard from "./TickerCard";
import TrendingRow from "./TrendingRow";
import AddTickerForm from "./AddTickerForm";
import { useTickerList } from "@/hooks/useTickerList";
import type { TickerAgg } from "@/lib/view";

// Owns the interactive state: holdings + watchlist live in localStorage,
// trending is everything else, ranked by discussion volume.
export default function DashboardSections({ aggs }: { aggs: TickerAgg[] }) {
  const holdings = useTickerList("holdings", ["NVDA", "MU"]);
  const watchlist = useTickerList("watchlist", []);

  const byTicker = new Map(aggs.map((a) => [a.ticker, a]));
  const agg = (ticker: string): TickerAgg =>
    byTicker.get(ticker) ?? { ticker, bull: 0, bear: 0, neutral: 0, theses: [] };

  const trending = aggs
    .filter((a) => !holdings.tickers.includes(a.ticker) && !watchlist.tickers.includes(a.ticker))
    .sort((a, b) => b.theses.length - a.theses.length)
    .slice(0, 8);

  return (
    <>
      {/* ── Holdings ── */}
      <section id="holdings" className="px-11 pt-10 max-md:px-6">
        <div className="mb-5 flex items-baseline gap-3.5">
          <h2 className="font-display text-lg font-semibold tracking-tight">Your Holdings</h2>
          <span className="ml-auto text-xs text-faint">Stocks you own · sentiment & latest theses</span>
        </div>
        <AddTickerForm placeholder="Add a holding, e.g. NVDA" onAdd={holdings.add} />
        {holdings.tickers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-edge p-8 text-center text-[13px] text-faint">
            Add the stocks you own to see what Reddit is saying about them.
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
            {holdings.tickers.map((t) => (
              <TickerCard key={t} agg={agg(t)} onRemove={() => holdings.remove(t)} />
            ))}
          </div>
        )}
      </section>

      {/* ── Trending ── */}
      <section id="trending" className="px-11 pt-12 max-md:px-6">
        <div className="mb-5 flex items-baseline gap-3.5">
          <h2 className="font-display text-lg font-semibold tracking-tight">Trending New Ideas</h2>
          <span className="ml-auto text-xs text-faint">Most-discussed tickers you don&apos;t hold yet</span>
        </div>
        <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-edge bg-edge-soft">
          {trending.map((a, i) => (
            <TrendingRow key={a.ticker} agg={a} rank={i + 1} onWatch={() => watchlist.add(a.ticker)} />
          ))}
          {trending.length === 0 && (
            <div className="bg-panel p-8 text-center text-[13px] text-faint">
              Nothing trending outside your lists yet — run the worker to pull fresh theses.
            </div>
          )}
        </div>
      </section>

      {/* ── Watchlist ── */}
      <section id="watchlist" className="px-11 pt-12 max-md:px-6">
        <div className="mb-5 flex items-baseline gap-3.5">
          <h2 className="font-display text-lg font-semibold tracking-tight">Watchlist</h2>
          <span className="ml-auto text-xs text-faint">Ideas you&apos;re tracking</span>
        </div>
        <AddTickerForm placeholder="Add to watchlist, e.g. TSLA" onAdd={watchlist.add} />
        {watchlist.tickers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-edge p-8 text-center text-[13px] text-faint">
            Your watchlist is empty. Add a trending idea above to follow its sentiment.
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
            {watchlist.tickers.map((t) => (
              <TickerCard key={t} agg={agg(t)} onRemove={() => watchlist.remove(t)} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
