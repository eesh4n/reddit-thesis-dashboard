"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";

// Rate the extraction, not the trade — "good extraction" means the AI
// correctly captured what the poster was actually arguing. Clicking the
// already-active thumb un-votes it. Builds a dataset for eventually
// tightening the extraction prompt.
export default function FeedbackButtons({ thesisId, initialVote }: { thesisId: string; initialVote: "good" | "bad" | null }) {
  const [vote, setVote] = useState(initialVote);
  const [pending, setPending] = useState(false);

  async function cast(next: "good" | "bad") {
    if (pending) return;
    const clearing = vote === next;
    setPending(true);
    const prev = vote;
    setVote(clearing ? null : next); // optimistic

    try {
      const res = clearing
        ? await fetch("/api/feedback", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ thesisId }),
          })
        : await fetch("/api/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ thesisId, vote: next }),
          });
      if (!res.ok) setVote(prev); // roll back on failure
    } catch {
      setVote(prev);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => cast("good")}
        aria-label="Good extraction"
        aria-pressed={vote === "good"}
        className={`cursor-pointer rounded-md p-1.5 transition-colors duration-150 ${vote === "good" ? "bg-bull-dim text-bull" : "text-faint hover:bg-panel-2 hover:text-mute"}`}
      >
        <ThumbsUp size={12} />
      </button>
      <button
        onClick={() => cast("bad")}
        aria-label="Bad extraction"
        aria-pressed={vote === "bad"}
        className={`cursor-pointer rounded-md p-1.5 transition-colors duration-150 ${vote === "bad" ? "bg-bear-dim text-bear" : "text-faint hover:bg-panel-2 hover:text-mute"}`}
      >
        <ThumbsDown size={12} />
      </button>
    </div>
  );
}
