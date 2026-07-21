"use client";

import { useState } from "react";
import { NotebookPen, Check } from "lucide-react";

const MAX_LENGTH = 500;

// Your own take on a thesis — "agree, already long" / "skip, low conviction".
// Saves on blur (not on every keystroke) so typing doesn't spam the API;
// shows a brief "Saved" confirmation so silent failures aren't invisible.
export default function NoteEditor({ thesisId, initialNote }: { thesisId: string; initialNote: string }) {
  const [value, setValue] = useState(initialNote);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (value === initialNote && saved) return; // nothing changed since last save
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thesisId, note: value }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Couldn't save note.");
        return;
      }
      setError(null);
      setSaved(true);
    } catch {
      setError("Network error — note not saved.");
    }
  }

  return (
    <div className="mt-3 border-t border-edge-soft pt-3">
      <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
        <NotebookPen size={11} /> Your take
        {saved && value && <Check size={11} className="text-bull" />}
      </label>
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
          if (error) setError(null);
        }}
        onBlur={save}
        maxLength={MAX_LENGTH}
        rows={2}
        placeholder="Agree? Already positioned? Skip it?"
        className={`w-full resize-none rounded-lg border bg-panel-2 px-3 py-2 text-[13px] text-fg placeholder:text-faint focus:outline-none ${error ? "border-bear" : "border-edge-soft focus:border-accent"}`}
      />
      {error && <p className="mt-1 text-[11px] text-bear">{error}</p>}
    </div>
  );
}
