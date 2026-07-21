"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

// App Router error boundary — catches render/data-fetch crashes in any page
// under this layout so a bug shows a recoverable screen instead of a blank
// page or Next's raw dev overlay in production.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink px-6 text-center">
      <AlertTriangle size={36} className="text-bear" />
      <h1 className="font-display text-2xl font-bold tracking-tight">Something went wrong</h1>
      <p className="max-w-sm text-[13.5px] text-mute">
        That page hit an unexpected error. Try again, or head back to the dashboard.
      </p>
      <button
        onClick={reset}
        className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-gold px-4 py-2.5 text-[13.5px] font-semibold text-[#1a1204] transition-[filter] duration-150 hover:brightness-110"
      >
        <RotateCcw size={15} /> Try again
      </button>
    </div>
  );
}
