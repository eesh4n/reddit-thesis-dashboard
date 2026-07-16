// Small inline SVG trend line — no charting library needed for one line.
// Plots net sentiment (bull - bear) per day over the window.
export default function Sparkline({ points }: { points: { date: string; net: number; total: number }[] }) {
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

  return (
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
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
