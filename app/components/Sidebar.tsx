"use client";

import { useEffect, useState } from "react";
import { Briefcase, Flame, Bookmark, LogOut, Sparkles } from "lucide-react";
import { signOut } from "next-auth/react";

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      <div className="mt-1.5 font-mono text-[22px] tracking-wide text-fg">
        {now ? now.toLocaleTimeString("en-US", { hour12: false }) : "--:--:--"}
      </div>
      <div className="mt-0.5 text-[11.5px] text-faint">
        {now ? now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : ""}
      </div>
    </>
  );
}

const links = [
  { href: "#digest", label: "What Changed", icon: Sparkles },
  { href: "#holdings", label: "Your Holdings", icon: Briefcase },
  { href: "#trending", label: "Trending Ideas", icon: Flame },
  { href: "#watchlist", label: "Watchlist", icon: Bookmark },
];

export default function Sidebar({ thesisCount, email }: { thesisCount: number; email?: string | null }) {
  return (
    <aside className="sticky top-0 flex h-screen flex-col gap-8 self-start border-r border-edge bg-gradient-to-b from-panel to-ink p-6 max-md:static max-md:h-auto max-md:flex-row max-md:flex-wrap max-md:items-center">
      <div className="flex items-center gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-gold to-[#b8842b] font-display text-[15px] font-bold text-[#1a1204] shadow-[0_6px_16px_-6px_var(--color-gold)]">
          ◆
        </div>
        <div>
          <div className="font-display text-[15px] font-semibold tracking-wide">Sentiment Desk</div>
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-faint">Reddit alpha</div>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 max-md:flex-row">
        <div className="mb-2 ml-2.5 text-[10px] uppercase tracking-[0.18em] text-faint max-md:hidden">Desk</div>
        {links.map(({ href, label, icon: Icon }) => (
          <a
            key={href}
            href={href}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] text-mute transition-colors duration-150 hover:bg-panel-2 hover:text-fg"
          >
            <Icon size={14} /> {label}
          </a>
        ))}
      </nav>

      <div className="mt-auto border-t border-edge-soft pt-4 max-md:mt-0 max-md:border-0 max-md:pt-0">
        <div className="flex items-center text-xs text-mute">
          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-bull shadow-[0_0_8px_var(--color-bull)]" />
          Live feed · {thesisCount} theses
        </div>
        <Clock />

        {email && (
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-edge-soft pt-3.5">
            <span className="truncate text-[11.5px] text-faint" title={email}>
              {email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              aria-label="Sign out"
              className="shrink-0 cursor-pointer rounded-md border border-edge bg-panel-2 p-1.5 text-mute transition-colors duration-150 hover:border-bear hover:text-bear focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <LogOut size={13} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
