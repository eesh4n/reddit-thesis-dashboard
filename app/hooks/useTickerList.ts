"use client";

import { useEffect, useState } from "react";

// localStorage-backed list of tickers. One hook, two uses: "holdings" and "watchlist".
export function useTickerList(storageKey: string, initial: string[] = []) {
  const [tickers, setTickers] = useState<string[]>(initial);
  const [loaded, setLoaded] = useState(false);

  // Read once on mount.
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) setTickers(JSON.parse(saved));
    setLoaded(true);
  }, [storageKey]);

  // Save on every change — but only after the initial read, so we never
  // clobber a saved list with the initial value.
  useEffect(() => {
    if (loaded) localStorage.setItem(storageKey, JSON.stringify(tickers));
  }, [tickers, loaded, storageKey]);

  function add(ticker: string) {
    const clean = ticker.trim().toUpperCase();
    if (!clean) return;
    setTickers((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
  }

  function remove(ticker: string) {
    setTickers((prev) => prev.filter((t) => t !== ticker));
  }

  return { tickers, add, remove, loaded };
}
