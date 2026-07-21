"use client";

import { useState } from "react";
import { Plus, AlertCircle } from "lucide-react";

export default function AddTickerForm({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (ticker: string) => Promise<string | null>;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="mb-5">
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault(); // stop the browser's default full-page reload
          setPending(true);
          const result = await onAdd(value);
          setPending(false);
          if (result) {
            setError(result); // add failed server-side — keep the input so the user can fix it
          } else {
            setError(null);
            setValue("");
          }
        }}
      >
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-invalid={!!error}
          className={`w-52 rounded-lg border bg-panel px-3.5 py-2 font-mono text-[13px] text-fg placeholder:text-faint focus:outline-none ${error ? "border-bear" : "border-edge focus:border-accent"}`}
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-[#ffffff] transition-[filter] duration-150 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus size={14} /> Add
        </button>
      </form>
      {error && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-bear">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}
