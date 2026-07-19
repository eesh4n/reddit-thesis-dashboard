import Link from "next/link";
import { Link2 } from "lucide-react";
import type { RelatedTicker } from "@/lib/related";

// Tickers whose theses share meaningful vocabulary with this one — a HBM-chip
// thesis on MU surfaces the same thesis showing up on SK Hynix, even though
// nothing in the schema formally links the two.
export default function RelatedTickers({ related }: { related: RelatedTicker[] }) {
  if (related.length === 0) return null;

  return (
    <div className="mb-8">
      <p className="mb-2.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-faint">
        <Link2 size={11} /> Related tickers
      </p>
      <div className="flex flex-wrap gap-2">
        {related.map((r) => (
          <Link
            key={r.ticker}
            href={`/ticker/${r.ticker}`}
            title={`Shared: ${r.sharedTerms.join(", ")}`}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-edge bg-panel px-3 py-1.5 font-mono text-[12.5px] font-semibold text-fg transition-colors duration-150 hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            {r.ticker}
            <span className="font-sans text-[11px] font-normal text-faint">{r.sharedTerms[0]}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
