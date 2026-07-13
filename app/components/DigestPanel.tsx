import Link from "next/link";
import { Sparkles, ArrowRightLeft, TrendingUp } from "lucide-react";
import type { Digest } from "@/lib/digest";

// "What changed since yesterday" — the morning-briefing payoff. Three signals,
// each comparing the last 24h of theses against the 24h before that.
export default function DigestPanel({ digest }: { digest: Digest }) {
  const { newTrending, sentimentFlips, volumeSpikes } = digest;
  const isEmpty = newTrending.length === 0 && sentimentFlips.length === 0 && volumeSpikes.length === 0;

  if (isEmpty) return null; // nothing changed — don't clutter the page with an empty panel

  return (
    <section id="digest" className="scroll-mt-6 px-11 pt-10 max-md:px-6">
      <div className="mb-5 flex items-baseline gap-3.5">
        <h2 className="font-display text-lg font-semibold tracking-tight">What Changed Since Yesterday</h2>
        <span className="ml-auto text-xs text-faint">Last 24h vs the 24h before</span>
      </div>

      <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
        <DigestColumn
          icon={<Sparkles size={13} />}
          title="Newly trending"
          empty="Nothing new today."
          items={newTrending.map((t) => (
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
        />

        <DigestColumn
          icon={<ArrowRightLeft size={13} />}
          title="Sentiment flips"
          empty="No reversals today."
          items={sentimentFlips.map((t) => (
            <Link
              key={t.ticker}
              href={`/ticker/${t.ticker}`}
              className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 transition-colors duration-150 hover:bg-panel-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <span className="font-mono text-[13px] font-semibold">{t.ticker}</span>
              <span className="flex items-center gap-1 text-[11.5px]">
                <span className={t.from === "bullish" ? "text-bull" : "text-bear"}>{t.from}</span>
                <span className="text-faint">→</span>
                <span className={t.to === "bullish" ? "text-bull" : "text-bear"}>{t.to}</span>
              </span>
            </Link>
          ))}
        />

        <DigestColumn
          icon={<TrendingUp size={13} />}
          title="Volume spikes"
          empty="Steady discussion, no spikes."
          items={volumeSpikes.map((t) => (
            <Link
              key={t.ticker}
              href={`/ticker/${t.ticker}`}
              className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 transition-colors duration-150 hover:bg-panel-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <span className="font-mono text-[13px] font-semibold">{t.ticker}</span>
              <span className="font-mono text-[11.5px] text-faint">
                {t.yesterdayCount} → {t.todayCount}
              </span>
            </Link>
          ))}
        />
      </div>
    </section>
  );
}

function DigestColumn({
  icon,
  title,
  items,
  empty,
}: {
  icon: React.ReactNode;
  title: string;
  items: React.ReactNode[];
  empty: string;
}) {
  return (
    <div className="rounded-xl border border-edge bg-panel p-4">
      <div className="mb-2.5 flex items-center gap-2 px-1 text-[11px] uppercase tracking-[0.1em] text-mute">
        {icon} {title}
      </div>
      {items.length === 0 ? (
        <p className="px-2.5 py-2 text-[12.5px] text-faint">{empty}</p>
      ) : (
        <div className="flex flex-col">{items}</div>
      )}
    </div>
  );
}
