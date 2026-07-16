"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

// Jump straight to any ticker's detail page. Uses a native <datalist> for
// autocomplete against tickers we actually have data for — zero extra
// dependencies, works with keyboard and screen readers out of the box.
export default function TickerSearch({ knownTickers }: { knownTickers: string[] }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Press "/" anywhere (except while typing in another field) to jump to search.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (e.key === "/" && !typing) {
        e.preventDefault(); // stop the browser's quick-find from opening
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <form
      className="flex flex-col gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        const ticker = value.trim().toUpperCase();
        if (!ticker) return;
        if (!knownTickers.includes(ticker)) {
          setError(`No theses for ${ticker} yet.`);
          return;
        }
        setError(null);
        setValue("");
        router.push(`/ticker/${ticker}`);
      }}
    >
      <div className="relative">
        <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          list="known-tickers"
          placeholder="Jump to ticker…"
          aria-label="Jump to ticker"
          className="w-full rounded-lg border border-edge bg-panel-2 py-2 pl-8 pr-3 font-mono text-[12.5px] text-fg placeholder:text-faint focus:border-gold focus:outline-none"
        />
        <datalist id="known-tickers">
          {knownTickers.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </div>
      {error && <p className="px-1 text-[11px] text-bear">{error}</p>}
    </form>
  );
}
