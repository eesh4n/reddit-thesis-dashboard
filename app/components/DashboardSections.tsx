"use client";

import TrendingRow from "./TrendingRow";
import type { TickerAgg } from "@/lib/view";

// Holdings and Watchlist are disabled for now — they're per-user rows in
// Postgres behind /api/portfolio, which requires a session, and sign-in is
// currently turned off (see middleware.ts). Re-add both sections once
// login is back.
export default function DashboardSections({ aggs }: { aggs: TickerAgg[] }) {
  const trending = [...aggs].sort((a, b) => b.theses.length - a.theses.length).slice(0, 8);

  return (
    <section id="trending" className="scroll-mt-6 px-11 pt-10 max-md:px-6">
      <div className="mb-5 flex items-baseline gap-3.5">
        <h2 className="font-display text-lg font-semibold tracking-tight">Trending Ideas</h2>
        <span className="ml-auto text-xs text-faint">Most-discussed tickers right now</span>
      </div>
      <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-edge bg-edge-soft">
        {trending.map((a, i) => (
          <TrendingRow key={a.ticker} agg={a} rank={i + 1} />
        ))}
        {trending.length === 0 && (
          <div className="bg-panel p-8 text-center text-[13px] text-faint">
            Nothing trending yet — run the worker to pull fresh theses.
          </div>
        )}
      </div>
    </section>
  );
}
