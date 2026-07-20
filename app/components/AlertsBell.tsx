"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useTickerList } from "@/hooks/useTickerList";
import { hasBearishAlert, type TickerAgg } from "@/lib/view";

// In-app delivery for the "notify me if a holding turns bearish" rule —
// no email/push infra is wired up, so this surfaces triggered alerts as a
// badge in the nav instead. Same threshold as the holding card's own
// warning icon (hasBearishAlert), just cross-referenced against your
// holdings list here so it can show a single count.
export default function AlertsBell({ aggs }: { aggs: TickerAgg[] }) {
  const holdings = useTickerList("holding");

  const byTicker = new Map(aggs.map((a) => [a.ticker, a]));
  const triggered = holdings.tickers.filter((t) => hasBearishAlert(byTicker.get(t)?.theses ?? []));

  return (
    <Link
      href="/alerts"
      className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-mute transition-colors duration-150 hover:bg-panel-2 hover:text-fg"
    >
      <span className="relative">
        <Bell size={16} />
        {triggered.length > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-bear text-[9px] font-bold text-white">
            {triggered.length}
          </span>
        )}
      </span>
      Alerts
    </Link>
  );
}
