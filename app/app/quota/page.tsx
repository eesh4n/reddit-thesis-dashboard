import Link from "next/link";
import { ArrowLeft, Gauge, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { getRecentWorkerRuns, getTodayRunStats, getBacklogCount } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function QuotaPage() {
  const [runs, today, backlog] = await Promise.all([
    getRecentWorkerRuns(20),
    getTodayRunStats(),
    getBacklogCount(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 pb-20 pt-9 md:px-11">
      <Link
        href="/"
        className="mb-8 inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-mute transition-colors duration-150 hover:text-fg"
      >
        <ArrowLeft size={14} /> Back to dashboard
      </Link>

      <header className="mb-8 border-b border-edge-soft pb-7">
        <p className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
          <Gauge size={13} /> Extraction quota
        </p>
        <h1 className="font-display text-[30px] font-bold leading-tight tracking-tight">
          What the worker is actually doing with its request budget.
        </h1>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-mute">
          Gemini&apos;s free tier caps <em>requests</em>, not tokens — a request batching 25 posts
          costs the same 1 request as a batch of 1. Extraction packs as many posts as reasonably
          fit per request specifically to maximize theses produced against that fixed budget.
        </p>
      </header>

      <div className="mb-9 grid grid-cols-3 gap-4 max-md:grid-cols-1">
        <StatCard label="Requests used today" value={today.requestsUsed.toLocaleString()} />
        <StatCard label="Theses extracted today" value={today.thesesExtracted.toLocaleString()} />
        <StatCard label="Posts still backlogged" value={backlog.toLocaleString()} accent={backlog > 0} />
      </div>

      <h2 className="mb-4 font-display text-base font-semibold tracking-tight">Recent runs</h2>
      <div className="flex flex-col gap-2">
        {runs.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 rounded-xl border border-edge bg-panel px-4 py-3 max-md:grid-cols-2 max-md:gap-y-2"
          >
            <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-mute">
              <Clock size={11} />
              {r.startedAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </span>
            <span className="font-mono text-[12px] text-faint">{r.postsIngested} ingested</span>
            <span className="font-mono text-[12px] text-faint">{r.requestsUsed} requests</span>
            <span className="font-mono text-[12px] font-semibold text-accent">{r.thesesExtracted} theses</span>
            <span
              className={`inline-flex items-center gap-1 justify-self-end font-mono text-[11px] font-semibold uppercase tracking-wider ${
                r.stoppedReason === "completed" ? "text-bull" : r.stoppedReason === "rate_limited" ? "text-bear" : "text-faint"
              }`}
            >
              {r.stoppedReason === "completed" ? (
                <CheckCircle2 size={11} />
              ) : r.stoppedReason === "rate_limited" ? (
                <AlertTriangle size={11} />
              ) : null}
              {r.stoppedReason ?? "running"}
            </span>
          </div>
        ))}
        {runs.length === 0 && (
          <div className="rounded-xl border border-dashed border-edge p-10 text-center text-[13px] text-faint">
            No worker runs recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-edge bg-panel p-5">
      <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-faint">{label}</p>
      <p className={`font-mono text-[28px] font-bold ${accent ? "text-accent" : "text-fg"}`}>{value}</p>
    </div>
  );
}
