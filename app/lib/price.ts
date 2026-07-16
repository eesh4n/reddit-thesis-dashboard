// Free daily price data via Yahoo Finance's public chart endpoint (no API key).
// Stooq was the first choice but now sits behind a JavaScript anti-bot wall.
// Returns null on any failure — bad ticker, network hiccup, schema change —
// so the UI simply omits the price chip instead of breaking the page.
// Cached for an hour per ticker; this is context, not a live quote.

export type PriceInfo = {
  last: number; // latest market price
  changePct5d: number; // % change vs ~5 trading days ago
};

type YahooChart = {
  chart?: {
    result?: {
      meta?: { regularMarketPrice?: number };
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
