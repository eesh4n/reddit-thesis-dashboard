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

  // Returns an error message on failure so callers can surface it; rolls
  // back the optimistic insert instead of leaving a "ghost" ticker in the
  // UI that was never actually saved server-side.
  const add = useCallback(
    async (ticker: string): Promise<string | null> => {
      const clean = ticker.trim().toUpperCase();
      if (!clean) return "Enter a ticker.";
      setTickers((prev) => (prev.includes(clean) ? prev : [...prev, clean])); // optimistic

      try {
        const res = await fetch("/api/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker: clean, list }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setTickers((prev) => prev.filter((t) => t !== clean)); // roll back
          return data?.error ?? "Couldn't add that ticker.";
        }
        return null;
      } catch {
        setTickers((prev) => prev.filter((t) => t !== clean)); // roll back
        return "Network error — try again.";
      }
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
