// Signed magnitude bar, -100 to +100, centered at 0. Unlike a percentage,
// this collapses toward 0 for thin/mixed evidence and only swings hard
// toward either edge when there's a real pile of fresh, confident,
// one-sided theses behind it — see computeAlphaScore.
export default function AlphaGauge({ score }: { score: number }) {
  const clamped = Math.max(-100, Math.min(100, score));
  const isBull = clamped > 0;
  const isFlat = clamped === 0;
  const barWidthPct = Math.abs(clamped) / 2; // half the track = full ±100 range
  const barLeftPct = clamped >= 0 ? 50 : 50 - barWidthPct;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-3 overflow-hidden rounded-full bg-panel-2">
        <div
          className={`absolute top-0 h-full rounded-full ${isFlat ? "" : isBull ? "bg-bull shadow-[0_0_10px_-2px_var(--color-bull)]" : "bg-bear shadow-[0_0_10px_-2px_var(--color-bear)]"}`}
          style={{ left: `${barLeftPct}%`, width: `${barWidthPct}%` }}
        />
        <div className="absolute top-0 h-full w-px bg-edge" style={{ left: "50%" }} />
      </div>
      <div className="flex justify-between font-mono text-[10.5px] font-semibold text-faint">
        <span>−100 bearish</span>
        <span>0</span>
        <span>+100 bullish</span>
      </div>
    </div>
  );
}
