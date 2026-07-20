import Link from "next/link";
import { Bookmark, Users } from "lucide-react";
import SentimentMeter from "./SentimentMeter";
import type { TickerAgg } from "@/lib/view";

// One row in the Trending list: rank, ticker (links to detail), sentiment balance, add-to-watchlist.
export default function TrendingRow({
  agg,
  rank,
  onWatch,
}: {
  agg: TickerAgg;
  rank: number;
  onWatch: () => void;
}) {
  const net = Math.round(agg.bull - agg.bear); // bull/bear are age-weighted, so round for a clean "+2" readout
  return (
    <div className="flex items-center gap-2.5 bg-panel px-3.5 py-3.5 transition-colors duration-150 hover:bg-panel-2 max-md:flex-wrap sm:gap-4 sm:px-5 sm:py-4">
      <span className="w-6 shrink-0 font-mono text-xs font-bold text-faint">{String(rank).padStart(2, "0")}</span>
      <Link
        href={`/ticker/${agg.ticker}`}
        className="w-16 shrink-0 cursor-pointer font-mono text-base font-extrabold tracking-tight transition-colors duration-150 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        {agg.ticker}
      </Link>
      {agg.consensus && (
        <Users
          size={12}
          className={`shrink-0 ${agg.consensus === "bullish" ? "text-bull" : "text-bear"}`}
          aria-label={`Consensus ${agg.consensus}`}
        />
      )}
      <div className="max-w-56 min-w-16 flex-1">
        <SentimentMeter bull={agg.bull} bear={agg.bear} neutral={agg.neutral} compact />
      </div>
      <span className="hidden whitespace-nowrap font-mono text-xs text-mute sm:inline">
        {agg.theses.length} {agg.theses.length === 1 ? "thesis" : "theses"} · {net >= 0 ? "+" : ""}
        {net}
      </span>
      <button
        onClick={onWatch}
        aria-label="Add to watchlist"
        className="ml-auto inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-edge bg-panel-2 px-2.5 py-1.5 text-xs text-mute transition-colors duration-150 hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <Bookmark size={12} /> <span className="hidden sm:inline">Watch</span>
      </button>
    </div>
  );
}
