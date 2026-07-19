"use client";

import { useMemo, useState } from "react";
import { ExternalLink, ArrowUpDown, Calendar, Hash } from "lucide-react";
import { formatPostDate } from "@/lib/formatDate";
import NoteEditor from "./NoteEditor";

export type DetailThesis = {
  id: string;
  summary: string;
  reasoning: string;
  sentiment: "bullish" | "bearish" | "neutral";
  confidence: number;
  extractedAt: string; // ISO — when we scraped/extracted it (used for the time filter)
  postedAt: string; // ISO — when the Reddit post itself went up (shown on the card)
  permalink: string;
  subreddit: string;
  author: string; // source post's Reddit username — feeds duplicate-author consensus dedup
  note: string; // this user's own annotation, "" if none saved yet
};

const dotColor = { bullish: "bg-bull", bearish: "bg-bear", neutral: "bg-mute" } as const;
const textColor = { bullish: "text-bull", bearish: "text-bear", neutral: "text-mute" } as const;

type SortKey = "newest" | "bullish" | "bearish" | "confidence";
type RangeKey = "all" | "24h" | "7d" | "30d";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "bullish", label: "Bullish first" },
  { key: "bearish", label: "Bearish first" },
  { key: "confidence", label: "Confidence" },
];

const RANGE_OPTIONS: { key: RangeKey; label: string; hours: number | null }[] = [
  { key: "24h", label: "24h", hours: 24 },
  { key: "7d", label: "7d", hours: 24 * 7 },
  { key: "30d", label: "30d", hours: 24 * 30 },
  { key: "all", label: "All time", hours: null },
];

export default function ThesisSortList({ theses }: { theses: DetailThesis[] }) {
  const [sort, setSort] = useState<SortKey>("newest");
  const [range, setRange] = useState<RangeKey>("all");
  const [subreddit, setSubreddit] = useState<string>("all"); // "all" or a subreddit name

  // Unique source subreddits for this ticker, biggest contributor first —
  // drives the filter chips so you can isolate one community's view.
  const subreddits = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of theses) counts.set(t.subreddit, (counts.get(t.subreddit) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [theses]);

  const filtered = useMemo(() => {
    const opt = RANGE_OPTIONS.find((r) => r.key === range)!;
    const cutoff = opt.hours === null ? null : Date.now() - opt.hours * 60 * 60 * 1000;
    return theses.filter(
      (t) =>
        (cutoff === null || new Date(t.extractedAt).getTime() >= cutoff) &&
        (subreddit === "all" || t.subreddit === subreddit),
    );
  }, [theses, range, subreddit]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    switch (sort) {
      case "bullish":
        // Bullish first, bearish last, each group newest-first.
        return copy.sort((a, b) => rank(a.sentiment, "bullish") - rank(b.sentiment, "bullish"));
      case "bearish":
        return copy.sort((a, b) => rank(a.sentiment, "bearish") - rank(b.sentiment, "bearish"));
      case "confidence":
        return copy.sort((a, b) => b.confidence - a.confidence);
      default:
        return copy; // already newest-first from the query
    }
  }, [filtered, sort]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Calendar size={13} className="mr-1 text-faint" />
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setRange(opt.key)}
            className={`cursor-pointer rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
              range === opt.key
                ? "border-gold bg-gold/15 text-gold"
                : "border-edge bg-panel text-mute hover:border-[#33445a] hover:text-fg"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {subreddits.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Hash size={13} className="mr-1 text-faint" />
          <button
            onClick={() => setSubreddit("all")}
            className={`cursor-pointer rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
              subreddit === "all"
                ? "border-gold bg-gold/15 text-gold"
                : "border-edge bg-panel text-mute hover:border-[#33445a] hover:text-fg"
            }`}
          >
            All subs
          </button>
          {subreddits.map(([name, count]) => (
            <button
              key={name}
              onClick={() => setSubreddit(name)}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                subreddit === name
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-edge bg-panel text-mute hover:border-[#33445a] hover:text-fg"
              }`}
            >
              r/{name} <span className="opacity-60">{count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <ArrowUpDown size={13} className="mr-1 text-faint" />
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSort(opt.key)}
            className={`cursor-pointer rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
              sort === opt.key
                ? "border-gold bg-gold/15 text-gold"
                : "border-edge bg-panel text-mute hover:border-[#33445a] hover:text-fg"
            }`}
          >
            {opt.label}
          </button>
        ))}
        <span className="ml-auto text-[12px] text-faint">
          {sorted.length} {sorted.length === 1 ? "thesis" : "theses"}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {sorted.map((t) => (
          <article key={t.id} className="rounded-xl border border-edge bg-panel p-5">
            <div className="mb-2 flex items-center gap-2.5">
              <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor[t.sentiment]}`} />
              <span className={`font-mono text-[11px] font-semibold uppercase tracking-wider ${textColor[t.sentiment]}`}>
                {t.sentiment}
              </span>
              <span className="text-[11px] text-faint">·</span>
              <span className="font-mono text-[11px] text-faint">{Math.round(t.confidence * 100)}% confidence</span>
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-faint">
                <Calendar size={10} /> {formatPostDate(t.postedAt)}
              </span>
              <span className="text-[11px] text-faint">·</span>
              <span className="text-[11px] text-faint">r/{t.subreddit}</span>
            </div>
            <p className="mb-1.5 text-[14.5px] font-medium leading-snug">{t.summary}</p>
            <p className="text-[13px] leading-relaxed text-mute">{t.reasoning}</p>
            <a
              href={t.permalink}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex cursor-pointer items-center gap-1 font-mono text-[11.5px] text-faint transition-colors duration-150 hover:text-gold"
            >
              view source post <ExternalLink size={11} />
            </a>
            <NoteEditor thesisId={t.id} initialNote={t.note} />
          </article>
        ))}
        {sorted.length === 0 && (
          <div className="rounded-xl border border-dashed border-edge p-10 text-center text-[13px] text-faint">
            {theses.length === 0 ? "No theses recorded for this ticker yet." : "No theses match these filters."}
          </div>
        )}
      </div>
    </div>
  );
}

// Lower rank sorts first. Primary group goes first (by sentiment), everything
// else follows in its natural (newest-first) relative order.
function rank(sentiment: DetailThesis["sentiment"], primary: "bullish" | "bearish") {
  if (sentiment === primary) return 0;
  if (sentiment === "neutral") return 1;
  return 2;
}
