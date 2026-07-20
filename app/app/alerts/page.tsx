import Link from "next/link";
import { ArrowLeft, AlertTriangle, ExternalLink } from "lucide-react";
import { auth } from "@/lib/auth";
import { getAllTheses } from "@/lib/queries";
import { getPortfolioUserId } from "@/lib/guest";
import { prisma } from "@/lib/db";
import { aggregateByTicker, hasBearishAlert, type ThesisView } from "@/lib/view";
import { formatPostDate } from "@/lib/formatDate";

export const dynamic = "force-dynamic";

// "Notify me if a stock I hold gets 3+ bearish theses in 24h" — delivered
// as an in-app alert center rather than email/push, since no delivery
// provider (Resend, web-push, etc.) is wired into this project yet. The
// sidebar bell badges this page whenever something's triggered.
export default async function AlertsPage() {
  const session = await auth();
  const userId = await getPortfolioUserId(session?.user?.id);

  const [holdings, rows] = await Promise.all([
    prisma.portfolio.findMany({ where: { userId, list: "holding" }, orderBy: { createdAt: "asc" } }),
    getAllTheses(30),
  ]);

  const theses: ThesisView[] = rows.map((r) => ({
    id: r.id,
    ticker: r.ticker,
    summary: r.summary,
    reasoning: r.reasoning,
    sentiment: r.sentiment as ThesisView["sentiment"],
    confidence: r.confidence,
    permalink: r.rawPost.permalink,
    postedAt: r.rawPost.postedAt.toISOString(),
    author: r.rawPost.author,
  }));
  const aggs = aggregateByTicker(theses);

  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const triggered = holdings
    .map((h) => {
      const agg = aggs.get(h.ticker);
      const recentBearish = (agg?.theses ?? [])
        .filter((t) => t.sentiment === "bearish" && new Date(t.postedAt).getTime() >= cutoff)
        .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
      return { ticker: h.ticker, recentBearish, triggered: hasBearishAlert(agg?.theses ?? []) };
    })
    .filter((h) => h.triggered);

  return (
    <div className="mx-auto max-w-3xl px-6 pb-20 pt-9 md:px-11">
      <Link
        href="/"
        className="mb-8 inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-mute transition-colors duration-150 hover:text-fg"
      >
        <ArrowLeft size={14} /> Back to dashboard
      </Link>

      <header className="mb-7 border-b border-edge-soft pb-7">
        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Alerts</p>
        <h1 className="mb-2 font-display text-[32px] font-bold leading-tight tracking-tight">
          Holdings turning bearish
        </h1>
        <p className="text-[13px] text-mute">
          A holding is flagged here when it gets 2+ bearish theses in the last 24h and bears outnumber bulls in
          that window — the same threshold that lights up the warning icon on its holding card.
        </p>
      </header>

      {holdings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-edge p-10 text-center text-[13px] text-faint">
          You don&apos;t have any holdings yet.{" "}
          <Link href="/#holdings" className="text-gold hover:brightness-110">
            Add some
          </Link>{" "}
          to start tracking bearish spikes.
        </div>
      ) : triggered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-edge p-10 text-center text-[13px] text-faint">
          Nothing flagged right now — all clear across your {holdings.length}{" "}
          {holdings.length === 1 ? "holding" : "holdings"}.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {triggered.map(({ ticker, recentBearish }) => (
            <div key={ticker} className="rounded-2xl border border-bear/30 bg-bear-dim/20 p-5">
              <div className="mb-3 flex items-center gap-2.5">
                <AlertTriangle size={16} className="text-bear" />
                <Link
                  href={`/ticker/${ticker}`}
                  className="font-mono text-lg font-extrabold tracking-tight transition-colors hover:text-gold"
                >
                  {ticker}
                </Link>
                <span className="font-mono text-[11px] font-semibold text-bear">
                  {recentBearish.length} bearish in the last 24h
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {recentBearish.map((t) => (
                  <div key={t.id} className="rounded-lg border border-edge bg-panel p-3.5">
                    <div className="mb-1 flex items-center gap-2 text-[11px] text-faint">
                      {formatPostDate(t.postedAt)}
                    </div>
                    <p className="mb-1 text-[13.5px] font-medium leading-snug">{t.summary}</p>
                    <a
                      href={t.permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-faint transition-colors hover:text-gold"
                    >
                      view source post <ExternalLink size={10} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
