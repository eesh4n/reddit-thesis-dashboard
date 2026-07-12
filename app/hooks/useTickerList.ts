"use client";

import { useEffect, useState, useCallback } from "react";

// Per-user ticker list backed by the Portfolio table (list = "holding" | "watchlist"),
// via /api/portfolio. Replaces the old localStorage version now that lists are
// tied to a signed-in account instead of a single browser.
export function useTickerList(list: "holding" | "watchlist", initial: string[] = []) {
  const [tickers, setTickers] = useState<string[]>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/portfolio?list=${list}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setTickers(data.tickers ?? []);
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [list]);

  const add = useCallback(
    async (ticker: string) => {
      const clean = ticker.trim().toUpperCase();
      if (!clean) return;
      setTickers((prev) => (prev.includes(clean) ? prev : [...prev, clean])); // optimistic
      await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: clean, list }),
      });
    },
    [list],
  );

  const remove = useCallback(
    async (ticker: string) => {
      setTickers((prev) => prev.filter((t) => t !== ticker)); // optimistic
      await fetch("/api/portfolio", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, list }),
      });
    },
    [list],
  );

  return { tickers, add, remove, loaded };
}
