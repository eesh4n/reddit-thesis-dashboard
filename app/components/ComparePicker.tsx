"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

const MAX_TICKERS = 3;

export default function ComparePicker({
  knownTickers,
  selected,
}: {
  knownTickers: string[];
  selected: string[];
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function pushTickers(next: string[]) {
    router.push(next.length ? `/compare?tickers=${next.join(",")}` : "/compare");
  }

  function add(raw: string) {
    const ticker = raw.trim().toUpperCase();
    if (!ticker) return;
    if (!knownTickers.includes(ticker)) {
      setError(`No theses for ${ticker} yet.`);
      return;
    }
    if (selected.includes(ticker)) {
      setError(`${ticker} is already in the comparison.`);
      return;
    }
    if (selected.length >= MAX_TICKERS) {
      setError(`Compare up to ${MAX_TICKERS} tickers at once.`);
      return;
    }
    setError(null);
    setValue("");
    pushTickers([...selected, ticker]);
    inputRef.current?.focus();
  }

  function remove(ticker: string) {
    pushTickers(selected.filter((t) => t !== ticker));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {selected.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 font-mono text-[12.5px] font-bold text-gold"
          >
            {t}
            <button
              onClick={() => remove(t)}
              aria-label={`Remove ${t}`}
              className="cursor-pointer text-gold/70 transition-colors hover:text-gold"
            >
              <X size={12} />
            </button>
          </span>
        ))}

        {selected.length < MAX_TICKERS && (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              add(value);
            }}
          >
            <div className="relative">
              <input
                ref={inputRef}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError(null);
                }}
                list="compare-known-tickers"
                placeholder={selected.length === 0 ? "Add a ticker to compare…" : "Add another…"}
                aria-label="Add a ticker to compare"
                className={`w-48 rounded-lg border bg-panel-2 px-3.5 py-2 font-mono text-[12.5px] text-fg placeholder:text-faint focus:outline-none ${error ? "border-bear" : "border-edge focus:border-gold"}`}
              />
              <datalist id="compare-known-tickers">
                {knownTickers
                  .filter((t) => !selected.includes(t))
                  .map((t) => (
                    <option key={t} value={t} />
                  ))}
              </datalist>
            </div>
            <button
              type="submit"
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-edge bg-panel-2 px-3 py-2 text-[12.5px] font-semibold text-mute transition-colors duration-150 hover:border-gold hover:text-gold"
            >
              <Plus size={13} /> Add
            </button>
          </form>
        )}
      </div>
      {error && <p className="mt-2 text-[12px] text-bear">{error}</p>}
    </div>
  );
}
