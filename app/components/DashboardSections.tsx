"use client";

import TickerCard from "./TickerCard";
import TrendingRow from "./TrendingRow";
import AddTickerForm from "./AddTickerForm";
import AlphaGauge from "./AlphaGauge";
import { useTickerList } from "@/hooks/useTickerList";
import { hasBearishAlert, computeAlphaScore, type TickerAgg } from "@/lib/view";

// Owns the interactive state: holdings + watchlist are per-user rows in
// Postgres (via /api/portfolio), trending is everything else, ranked by
// discussion volume.
export default function DashboardSections({ aggs }: { aggs: TickerAgg[] }) {
  const holdings = useTickerList("holding");
  const watchlist = useTickerList("watchlist");

  const byTicker = new Map(aggs.map((a) => [a.ticker, a]));
  const agg = (ticker: string): TickerAgg =>
    byTicker.get(ticker) ?? { ticker, bull: 0, bear: 0, neutral: 0, theses: [], consensus: null };

  // Alpha Score scoped to just this list's theses — not the whole market,
  // which told you nothing about the tickers you actually hold or watch.
  const scoreFor = (tickers: string[]) => computeAlphaScore(tickers.flatMap((t) => agg(t).theses));

  const trending = aggs
    .filter((a) => !holdings.tickers.includes(a.ticker) && !watchlist.tickers.includes(a.ticker))
    .sort((a, b) => b.theses.length - a.theses.length)
    .slice(0, 8);

  return (
    <>
      {/* ── Holdings ── */}
      <section id="holdings" className="scroll-mt-6 px-11 pt-10 max-md:px-6">
        <div className="mb-5 flex items-baseline gap-3.5">
          <h2 className="font-display text-lg font-semibold tracking-tight">Your Holdings</h2>
          <span className="ml-auto text-xs text-faint">Stocks you own · click a card for the full picture</span>
        </div>
        {holdings.loaded && holdings.tickers.length > 0 && (
          <div className="mb-5 rounded-xl border border-edge bg-panel p-4">
            <p
              className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-faint"
              title="Weighs each of your holdings' theses by confidence and recency, then scales toward ±100 only as real evidence piles up."
            >
              Holdings alpha score
            </p>
            <AlphaGauge score={scoreFor(holdings.tickers)} />
          </div>
        )}
        <AddTickerForm placeholder="Add a holding, e.g. NVDA" onAdd={holdings.add} />
        {!holdings.loaded ? (
          <CardsSkeleton />
        ) : holdings.tickers.length === 0 ? (
          <EmptyState text="Add the stocks you own to see what Reddit is saying about them." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
            {holdings.tickers.map((t) => (
              <TickerCard key={t} agg={agg(t)} onRemove={() => holdings.remove(t)} alert={hasBearishAlert(agg(t).theses)} />
            ))}
          </div>
        )}
      </section>

      {/* ── Trending ── */}
      <section id="trending" className="scroll-mt-6 px-11 pt-12 max-md:px-6">
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
      <section id="watchlist" className="scroll-mt-6 px-11 pt-12 max-md:px-6">
        <div className="mb-5 flex items-baseline gap-3.5">
          <h2 className="font-display text-lg font-semibold tracking-tight">Watchlist</h2>
          <span className="ml-auto text-xs text-faint">Ideas you&apos;re tracking</span>
        </div>
        {watchlist.loaded && watchlist.tickers.length > 0 && (
          <div className="mb-5 rounded-xl border border-edge bg-panel p-4">
            <p
              className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-faint"
              title="Weighs each watchlist ticker's theses by confidence and recency, then scales toward ±100 only as real evidence piles up."
            >
              Watchlist alpha score
            </p>
            <AlphaGauge score={scoreFor(watchlist.tickers)} />
          </div>
        )}
        <AddTickerForm placeholder="Add to watchlist, e.g. TSLA" onAdd={watchlist.add} />
        {!watchlist.loaded ? (
          <CardsSkeleton />
        ) : watchlist.tickers.length === 0 ? (
          <EmptyState text="Your watchlist is empty. Add a trending idea above to follow its sentiment." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
            {watchlist.tickers.map((t) => (
              <TickerCard key={t} agg={agg(t)} onRemove={() => watchlist.remove(t)} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-edge p-8 text-center text-[13px] text-faint">{text}</div>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
      {[0, 1].map((i) => (
        <div key={i} className="h-40 animate-pulse rounded-xl border border-edge bg-panel" />
      ))}
    </div>
  );
}
