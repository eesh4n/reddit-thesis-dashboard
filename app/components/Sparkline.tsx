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

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-8 w-full" preserveAspectRatio="none" aria-hidden="true">
      <line
        x1={0}
        y1={zeroY}
        x2={width}
        y2={zeroY}
        stroke="var(--color-edge-soft)"
        strokeWidth={1}
        strokeDasharray="2 2"
      />
      <path
        d={path}
        fill="none"
        stroke={trendUp ? "var(--color-bull)" : "var(--color-bear)"}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
