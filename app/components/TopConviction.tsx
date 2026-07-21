import Link from "next/link";
import { Award, ExternalLink } from "lucide-react";

export type ConvictionThesis = {
  id: string;
  ticker: string;
  summary: string;
  reasoning: string;
  sentiment: "bullish" | "bearish" | "neutral";
  confidence: number;
  permalink: string;
  subreddit: string;
};

const textColor = { bullish: "text-bull", bearish: "text-bear", neutral: "text-mute" } as const;
const chipCls = {
  bullish: "bg-bull-dim text-bull",
  bearish: "bg-bear-dim text-bear",
  neutral: "bg-panel-2 text-mute",
} as const;

// The strongest ideas right now across every subreddit, regardless of
// whether you hold the ticker — ranked by confidence decayed by how
// recently the post went up (see getTopConvictionToday), so this list keeps
// moving as new extractions land instead of freezing on a fixed window.
export default function TopConviction({ theses }: { theses: ConvictionThesis[] }) {
  if (theses.length === 0) return null; // nothing meets the bar yet — don't render an empty shell

  return (
    <section id="conviction" className="scroll-mt-6 px-11 pt-10 max-md:px-6">
      <div className="mb-5 flex items-baseline gap-3.5">
        <h2 className="font-display text-lg font-semibold tracking-tight">Top Conviction</h2>
        <span className="ml-auto text-xs text-faint">Highest-conviction ideas right now</span>
      </div>

      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        {theses.map((t) => (
          <article key={t.id} className="flex flex-col gap-2.5 rounded-2xl border border-edge bg-panel p-5">
            <div className="flex items-center gap-2.5">
              <Link
                href={`/ticker/${t.ticker}`}
                className="cursor-pointer font-mono text-base font-extrabold tracking-tight transition-colors duration-150 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                {t.ticker}
              </Link>
              <span className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${chipCls[t.sentiment]}`}>
                {t.sentiment}
              </span>
              <span className="ml-auto inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-gold">
                <Award size={11} /> {Math.round(t.confidence * 100)}%
              </span>
            </div>
            <p className={`text-[14px] font-semibold leading-snug ${textColor[t.sentiment]}`}>{t.summary}</p>
            <p className="text-[12.5px] leading-relaxed text-mute">{t.reasoning}</p>
            <a
              href={t.permalink}
              target="_blank"
              rel="noreferrer"
              className="mt-auto inline-flex cursor-pointer items-center gap-1 font-mono text-[11px] text-faint transition-colors duration-150 hover:text-gold"
            >
              r/{t.subreddit} <ExternalLink size={10} />
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
