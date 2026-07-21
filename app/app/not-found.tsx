import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink px-6 text-center">
      <SearchX size={36} className="text-faint" />
      <h1 className="font-display text-2xl font-bold tracking-tight">Page not found</h1>
      <p className="max-w-sm text-[13.5px] text-mute">
        Nothing here — the ticker, thesis, or page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-[#ffffff] transition-[filter] duration-150 hover:brightness-110"
      >
        <ArrowLeft size={15} /> Back to dashboard
      </Link>
    </div>
  );
}
