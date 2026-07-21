import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { Digest } from "@/lib/digest";

// "What changed since yesterday" — the morning-briefing payoff: which
// tickers are newly being discussed today that were silent yesterday.
export default function DigestPanel({ digest }: { digest: Digest }) {
  const { newTrending } = digest;

  if (newTrending.length === 0) return null; // nothing new — don't clutter the page with an empty panel

  return (
    <section id="digest" className="scroll-mt-6 px-11 pt-10 max-md:px-6">
      <div className="mb-5 flex items-baseline gap-3.5">
        <h2 className="font-display text-lg font-semibold tracking-tight">What Changed Since Yesterday</h2>
        <span className="ml-auto text-xs text-faint">Last 24h vs the 24h before</span>
      </div>

      <div className="rounded-xl border border-edge bg-panel p-4">
        <div className="mb-2.5 flex items-center gap-2 px-1 text-[11px] uppercase tracking-[0.1em] text-mute">
          <Sparkles size={13} /> Newly trending
        </div>
        <div className="grid grid-cols-3 gap-x-4 max-lg:grid-cols-1">
          {newTrending.map((t) => (
            <Link
              key={t.ticker}
              href={`/ticker/${t.ticker}`}
              className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 transition-colors duration-150 hover:bg-panel-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <span className="font-mono text-[13px] font-semibold">{t.ticker}</span>
              <span className="text-[11.5px] text-faint">
                {t.todayCount} {t.todayCount === 1 ? "thesis" : "theses"}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
