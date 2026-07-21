// Small inline SVG trend line — no charting library needed. Plots net
// sentiment (bull - bear) per day, with an optional price overlay so you can
// eyeball whether Reddit sentiment actually tracks the stock's real moves.
import { AlertTriangle } from "lucide-react";
import { forwardFillPrices, detectDivergence, type SentimentPoint, type PricePoint } from "@/lib/view";

export default function Sparkline({
  points,
  pricePoints,
}: {
  points: SentimentPoint[];
  pricePoints?: PricePoint[] | null;
}) {
  const width = 100;
  const height = 32;
  const pad = 2;

  const values = points.map((p) => p.net);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, -1);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1 || 1)) * (width - pad * 2) + pad;
    const y = height - pad - ((p.net - min) / range) * (height - pad * 2);
    return { x, y, net: p.net };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const zeroY = height - pad - ((0 - min) / range) * (height - pad * 2);
  const trendUp = points.length > 1 && points[points.length - 1].net >= points[0].net;
  const color = trendUp ? "var(--color-bull)" : "var(--color-bear)";

  // Close the line path down to the zero baseline to make a fillable area.
  const first = coords[0];
  const lastC = coords[coords.length - 1];
  const areaPath = `${path} L ${lastC.x.toFixed(1)} ${zeroY.toFixed(1)} L ${first.x.toFixed(1)} ${zeroY.toFixed(1)} Z`;
  const gradientId = trendUp ? "spark-fill-up" : "spark-fill-down";

  // Price overlay: forward-fill onto the same date axis as the sentiment
  // points (markets are closed weekends/holidays, sentiment isn't), then
  // scale independently — price and net-sentiment live on wildly different
  // ranges, so sharing a y-axis would flatten one of them to nothing.
  let pricePath: string | null = null;
  if (pricePoints && pricePoints.length > 1) {
    const filled = forwardFillPrices(points, pricePoints);
    const pMax = Math.max(...filled);
    const pMin = Math.min(...filled);
    const pRange = pMax - pMin || 1;
    const pCoords = filled.map((close, i) => {
      const x = (i / (filled.length - 1 || 1)) * (width - pad * 2) + pad;
      const y = height - pad - ((close - pMin) / pRange) * (height - pad * 2);
      return { x, y };
    });
    pricePath = pCoords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  }

  // "Is the crowd wrong or early?" — price and sentiment moved opposite
  // ways over the last several days. See detectDivergence for thresholds.
  const divergence = detectDivergence(points, pricePoints);

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-8 w-full" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <line
          x1={0}
          y1={zeroY}
          x2={width}
          y2={zeroY}
          stroke="var(--color-edge-soft)"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path d={path} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        {pricePath && (
          <path
            d={pricePath}
            fill="none"
            stroke="var(--color-gold)"
            strokeWidth={1.3}
            strokeDasharray="3 2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.85}
          />
        )}
      </svg>
      {pricePath && (
        <div className="mt-1.5 flex items-center gap-3 text-[10.5px] text-faint">
          <span className="inline-flex items-center gap-1">
            <span className={`inline-block h-0.5 w-3 rounded-full ${trendUp ? "bg-bull" : "bg-bear"}`} /> sentiment
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-0.5 w-3 rounded-full border-t border-dashed border-gold" /> price
          </span>
        </div>
      )}
      {divergence && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-2.5 py-2 text-[11px] leading-snug text-gold">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          {divergence.direction === "priceUpSentimentDown" ? (
            <span>
              Diverging: price up {divergence.priceChangePct.toFixed(1)}% while Reddit turned bearish over the same
              stretch — the crowd may be early, or wrong.
            </span>
          ) : (
            <span>
              Diverging: price down {Math.abs(divergence.priceChangePct).toFixed(1)}% while Reddit turned bullish
              over the same stretch — the crowd may be early, or wrong.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
