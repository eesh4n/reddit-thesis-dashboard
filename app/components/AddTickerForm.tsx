"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

export default function AddTickerForm({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (ticker: string) => void;
}) {
  const [value, setValue] = useState("");

  return (
    <form
      className="mb-5 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault(); // stop the browser's default full-page reload
        onAdd(value);
        setValue("");
      }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
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
