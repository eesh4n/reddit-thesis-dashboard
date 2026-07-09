"use client";

import { Plus } from "lucide-react";

// UI only. TODO(you): add useState for the input value and an onSubmit that
// adds the ticker to holdings/watchlist state (localStorage-backed).
export default function AddTickerForm({ placeholder }: { placeholder: string }) {
  return (
    <form
      className="mb-5 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault(); // TODO(you): replace with your add-ticker logic
      }}
    >
      <input
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-52 rounded-lg border border-edge bg-panel px-3.5 py-2 font-mono text-[13px] text-fg placeholder:text-faint focus:border-gold focus:outline-none"
      />
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-[13px] font-semibold text-[#1a1204] transition-[filter] hover:brightness-110"
      >
        <Plus size={14} /> Add
      </button>
    </form>
  );
}
