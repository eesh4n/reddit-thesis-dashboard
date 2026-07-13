// The signature element: a split bar showing the balance of bull/bear opinion.
// Pure presentation — pass it counts, it renders proportions.
export default function SentimentMeter({
  bull,
  bear,
  neutral = 0,
  compact = false,
}: {
  bull: number;
  bear: number;
  neutral?: number;
  compact?: boolean;
}) {
  const total = bull + bear + neutral || 1;
  return (
    <div className="flex flex-col gap-2">
      <div className={`flex overflow-hidden rounded-full bg-panel-2 ${compact ? "h-2" : "h-3"}`}>
        <div className="bg-bull shadow-[0_0_10px_-2px_var(--color-bull)]" style={{ width: `${(bull / total) * 100}%` }} />
        <div className="bg-[#3a4655]" style={{ width: `${(neutral / total) * 100}%` }} />
        <div className="bg-bear shadow-[0_0_10px_-2px_var(--color-bear)]" style={{ width: `${(bear / total) * 100}%` }} />
      </div>
      {!compact && (
        <div className="flex justify-between font-mono text-[12px] font-semibold">
          <span className="text-bull">{bull} bull</span>
          {neutral > 0 && <span className="text-faint">{neutral} neutral</span>}
          <span className="text-bear">{bear} bear</span>
        </div>
      )}
    </div>
  );
}
