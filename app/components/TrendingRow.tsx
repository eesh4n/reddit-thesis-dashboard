import Link from "next/link";
import { Bookmark } from "lucide-react";
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
  const net = agg.bull - agg.bear;
  return (
    <div className="flex items-center gap-4 bg-panel px-5 py-3.5 transition-colors duration-150 hover:bg-panel-2">
      <span className="w-6 font-mono text-xs text-faint">{String(rank).padStart(2, "0")}</span>
      <Link
        href={`/ticker/${agg.ticker}`}
        className="w-16 cursor-pointer font-mono text-[15px] font-semibold transition-colors duration-150 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        {agg.ticker}
      </Link>
      <div className="max-w-56 flex-1">
        <SentimentMeter bull={agg.bull} bear={agg.bear} neutral={agg.neutral} compact />
      </div>
      <span className="whitespace-nowrap font-mono text-xs text-mute">
        {agg.theses.length} {agg.theses.length === 1 ? "thesis" : "theses"} · {net >= 0 ? "+" : ""}
        {net}
      </span>
      <button
        onClick={onWatch}
        className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-edge bg-panel-2 px-2.5 py-1.5 text-xs text-mute transition-colors duration-150 hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <Bookmark size={12} /> Watch
      </button>
    </div>
  );
}
