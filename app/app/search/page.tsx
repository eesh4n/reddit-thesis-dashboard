import Link from "next/link";
import { Search as SearchIcon, ExternalLink, ArrowLeft } from "lucide-react";
import { searchTheses } from "@/lib/queries";
import { formatPostDate } from "@/lib/formatDate";

export const dynamic = "force-dynamic";

const dotColor = { bullish: "bg-bull", bearish: "bg-bear", neutral: "bg-mute" } as const;
const textColor = { bullish: "text-bull", bearish: "text-bear", neutral: "text-mute" } as const;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const results = q.trim() ? await searchTheses(q) : [];

  return (
    <div className="mx-auto max-w-3xl px-6 pb-20 pt-9 md:px-11">
      <Link
        href="/"
        className="mb-8 inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-mute transition-colors duration-150 hover:text-fg"
      >
        <ArrowLeft size={14} /> Back to dashboard
      </Link>

      <header className="mb-7 border-b border-edge-soft pb-7">
        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Search</p>
        <h1 className="mb-5 font-display text-[32px] font-bold leading-tight tracking-tight">
          Search every thesis
        </h1>
        <form className="relative" action="/search">
          <SearchIcon size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            autoFocus
            placeholder="Search tickers, summaries, reasoning…"
            className="w-full rounded-xl border border-edge bg-panel-2 py-3 pl-10 pr-4 text-[14px] text-fg placeholder:text-faint focus:border-gold focus:outline-none"
          />
        </form>
      </header>

      {q.trim() && (
        <p className="mb-4 text-[12px] text-faint">
          {results.length} {results.length === 1 ? "result" : "results"} for &ldquo;{q}&rdquo;
        </p>
      )}

      <div className="flex flex-col gap-3">
        {results.map((t) => (
          <article key={t.id} className="rounded-xl border border-edge bg-panel p-5">
            <div className="mb-2 flex items-center gap-2.5">
              <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor[t.sentiment as keyof typeof dotColor]}`} />
              <span
                className={`font-mono text-[11px] font-semibold uppercase tracking-wider ${textColor[t.sentiment as keyof typeof textColor]}`}
              >
                {t.sentiment}
              </span>
              <span className="text-[11px] text-faint">·</span>
              <Link
                href={`/ticker/${t.ticker}`}
                className="font-mono text-[12px] font-bold tracking-tight text-gold transition-colors hover:brightness-110"
              >
                {t.ticker}
              </Link>
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-faint">
                {formatPostDate(t.rawPost.postedAt.toISOString())}
              </span>
              <span className="text-[11px] text-faint">·</span>
              <span className="text-[11px] text-faint">r/{t.rawPost.subreddit}</span>
            </div>
            <p className="mb-1.5 text-[14.5px] font-medium leading-snug">{t.summary}</p>
            <p className="text-[13px] leading-relaxed text-mute">{t.reasoning}</p>
            <a
              href={t.rawPost.permalink}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex cursor-pointer items-center gap-1 font-mono text-[11.5px] text-faint transition-colors duration-150 hover:text-gold"
            >
              view source post <ExternalLink size={11} />
            </a>
          </article>
        ))}

        {q.trim() && results.length === 0 && (
          <div className="rounded-xl border border-dashed border-edge p-10 text-center text-[13px] text-faint">
            No theses match &ldquo;{q}&rdquo;.
          </div>
        )}

        {!q.trim() && (
          <div className="rounded-xl border border-dashed border-edge p-10 text-center text-[13px] text-faint">
            Search across every scraped thesis — tickers, summaries, and the reasoning behind them.
          </div>
        )}
      </div>
    </div>
  );
}
