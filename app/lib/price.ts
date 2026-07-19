// Free daily price data via Yahoo Finance's public chart endpoint (no API key).
// Stooq was the first choice but now sits behind a JavaScript anti-bot wall.
// Returns null on any failure — bad ticker, network hiccup, schema change —
// so the UI simply omits the price chip instead of breaking the page.
// Cached for an hour per ticker; this is context, not a live quote.

export type PriceInfo = {
  last: number; // latest market price
  changePct5d: number; // % change vs ~5 trading days ago
};

export type PricePoint = { date: string; close: number }; // date: YYYY-MM-DD

type YahooChart = {
  chart?: {
    result?: {
      meta?: { regularMarketPrice?: number };
      timestamp?: number[];
      indicators?: { quote?: { close?: (number | null)[] }[] };
    }[];
  };
};

export async function getPriceInfo(ticker: string): Promise<PriceInfo | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=5d&interval=1d`,
      {
        headers: { "User-Agent": "Mozilla/5.0" }, // Yahoo rejects default fetch UAs
        next: { revalidate: 3600 },
      },
    );
    if (!res.ok) return null;

    const data = (await res.json()) as YahooChart;
    const result = data.chart?.result?.[0];
    const last = result?.meta?.regularMarketPrice;
    const closes = (result?.indicators?.quote?.[0]?.close ?? []).filter((c): c is number => c != null);
    if (typeof last !== "number" || closes.length === 0) return null;

    const ref = closes[0]; // oldest close in the 5-day window
    return { last, changePct5d: ((last - ref) / ref) * 100 };
  } catch {
    return null;
  }
}

// Daily closes for the last `days` calendar days — feeds the price overlay
// on the sentiment sparkline. Returns null (not an empty array) on failure so
// the caller can distinguish "no price data" from "priced at zero."
export async function getPriceHistory(ticker: string, days = 14): Promise<PricePoint[] | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1mo&interval=1d`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 3600 },
      },
    );
    if (!res.ok) return null;

    const data = (await res.json()) as YahooChart;
    const result = data.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    if (timestamps.length === 0) return null;

    const points: PricePoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i];
      if (close == null) continue; // market holiday / no trade that day
      points.push({ date: new Date(timestamps[i] * 1000).toISOString().slice(0, 10), close });
    }

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return points.filter((p) => p.date >= cutoff);
  } catch {
    return null;
  }
}
