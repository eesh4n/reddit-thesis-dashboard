import { ExternalLink, X } from "lucide-react";
import SentimentMeter from "./SentimentMeter";
import type { TickerAgg } from "@/lib/view";

const dotColor = {
  bullish: "bg-bull",
  bearish: "bg-bear",
  neutral: "bg-mute",
} as const;

// One ticker with its sentiment balance and latest theses.
// `onRemoveLabel` is display-only — you wire the actual remove handler.
export default function TickerCard({ agg }: { agg: TickerAgg }) {
  const net = agg.bull - agg.bear;
  const lean =
    net > 0
      ? { label: "net bullish", cls: "bg-bull-dim text-bull" }
      : net < 0
        ? { label: "net bearish", cls: "bg-bear-dim text-bear" }
        : { label: "mixed", cls: "bg-panel-2 text-mute" };

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-edge bg-panel p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#33445a]">
      <header className="flex items-center gap-2.5">
        <h3 className="font-mono text-lg font-semibold tracking-tight">{agg.ticker}</h3>
        <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${lean.cls}`}>
          {lean.label}
        </span>
        {/* TODO(you): wire this to remove the ticker from holdings/watchlist */}
        <button
          aria-label={`Remove ${agg.ticker}`}
          className="ml-auto rounded-md border border-edge bg-panel-2 p-1.5 text-mute transition-colors hover:border-bear hover:text-bear"
        >
          <X size={13} />
        </button>
      </header>

      <SentimentMeter bull={agg.bull} bear={agg.bear} neutral={agg.neutral} />

      <div className="flex flex-col gap-4">
        {agg.theses.slice(0, 2).map((t) => (
          <div key={t.id} className="border-t border-edge-soft pt-3.5">
            <p className="mb-1 flex items-start gap-2 text-[13.5px] font-medium leading-snug">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotColor[t.sentiment]}`} />
              {t.summary}
            </p>
            <p className="pl-3.5 text-[12.5px] leading-relaxed text-mute">{t.reasoning}</p>
            <div className="mt-2 flex items-center gap-3 pl-3.5 font-mono text-[11px] text-faint">
              <span>{Math.round(t.confidence * 100)}% conf</span>
              <a
                href={t.permalink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 transition-colors hover:text-gold"
              >
                source <ExternalLink size={10} />
              </a>
            </div>
          </div>
        ))}
        {agg.theses.length === 0 && (
          <p className="border-t border-edge-soft pt-3.5 text-[12.5px] text-faint">
            No theses yet for {agg.ticker}. It will appear here when Reddit starts talking.
          </p>
        )}
      </div>
    </article>
  );
}
