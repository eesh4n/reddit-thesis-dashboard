"use client";

import { useRouter } from "next/navigation";
import { ExternalLink, X, ArrowUpRight, Users, Calendar, TriangleAlert } from "lucide-react";
import SentimentMeter from "./SentimentMeter";
import type { TickerAgg } from "@/lib/view";
import { formatPostDate } from "@/lib/formatDate";

const dotColor = {
  bullish: "bg-bull",
  bearish: "bg-bear",
  neutral: "bg-mute",
} as const;

// One ticker with its sentiment balance and latest theses. The whole card
// navigates to the ticker detail page on click. It's a <div> (not a <Link>)
// because it contains a real <a> for the Reddit source — nesting an <a>
// inside an <a> is invalid HTML and breaks hydration. role="link" + tabIndex
// + onKeyDown keep it keyboard-accessible despite not being a native anchor.
// `alert` marks a recent bearish turn (computed by the parent from the last
// 24h of theses) — shown as a warning chip so it stands out on a morning skim.
export default function TickerCard({
  agg,
  onRemove,
  alert = false,
}: {
  agg: TickerAgg;
  onRemove: () => void;
  alert?: boolean;
}) {
  const router = useRouter();
  const net = agg.bull - agg.bear;
  const lean =
    net > 0
      ? { label: "net bullish", cls: "bg-bull-dim text-bull" }
      : net < 0
        ? { label: "net bearish", cls: "bg-bear-dim text-bear" }
        : { label: "mixed", cls: "bg-panel-2 text-mute" };

  const href = `/ticker/${agg.ticker}`;
  const goToDetail = () => router.push(href);

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={`View all theses for ${agg.ticker}`}
      onClick={goToDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToDetail();
        }
      }}
      className="group flex cursor-pointer flex-col gap-4 rounded-2xl border border-edge bg-panel p-5 transition-all duration-150 hover:-translate-y-1 hover:border-[#3a4658] hover:shadow-[0_16px_36px_-14px_rgba(0,0,0,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <header className="flex items-center gap-2.5">
        <h3 className="font-mono text-xl font-extrabold tracking-tight">{agg.ticker}</h3>
        <span className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${lean.cls}`}>
          {lean.label}
        </span>
        {agg.consensus && (
          <span
            title={`${agg.consensus === "bullish" ? agg.bull : agg.bear} independent posts agree`}
            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${agg.consensus === "bullish" ? "bg-bull-dim text-bull" : "bg-bear-dim text-bear"}`}
          >
            <Users size={9} /> consensus
          </span>
        )}
        {alert && (
          <span
            title="2+ bearish theses in the last 24 hours"
            className="inline-flex items-center gap-1 rounded-md bg-bear px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#2a0808]"
          >
            <TriangleAlert size={10} /> bearish 24h
          </span>
        )}
        <ArrowUpRight
          size={14}
          className="text-faint opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        />
        <button
          onClick={(e) => {
            e.stopPropagation(); // don't trigger the card's navigate
            onRemove();
          }}
          aria-label={`Remove ${agg.ticker}`}
          className="ml-auto cursor-pointer rounded-md border border-edge bg-panel-2 p-1.5 text-mute transition-colors duration-150 hover:border-bear hover:text-bear"
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
              <span className="inline-flex items-center gap-1">
                <Calendar size={10} /> {formatPostDate(t.postedAt)}
              </span>
              <span>{Math.round(t.confidence * 100)}% conf</span>
              <a
                href={t.permalink}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()} // don't trigger the card's navigate
                className="inline-flex cursor-pointer items-center gap-1 transition-colors duration-150 hover:text-accent"
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
        {agg.theses.length > 2 && (
          <p className="-mt-2 text-[11.5px] text-faint">+{agg.theses.length - 2} more · view all</p>
        )}
      </div>
    </div>
  );
}
