"use client";

import { useState, useEffect, useMemo } from "react";
import type { ThesisRow } from "@/lib/queries";

type Agg = { ticker: string; theses: ThesisRow[]; bull: number; bear: number; neutral: number };

function aggregate(theses: ThesisRow[]): Map<string, Agg> {
  const map = new Map<string, Agg>();
  for (const t of theses) {
    const a = map.get(t.ticker) ?? { ticker: t.ticker, theses: [], bull: 0, bear: 0, neutral: 0 };
    a.theses.push(t);
    if (t.sentiment === "bullish") a.bull++;
    else if (t.sentiment === "bearish") a.bear++;
    else a.neutral++;
    map.set(t.ticker, a);
  }
  return map;
}

function Meter({ bull, bear, neutral }: { bull: number; bear: number; neutral: number }) {
  const total = bull + bear + neutral || 1;
  return (
    <div className="meter">
      <div className="meter-bar">
        <div className="b" style={{ width: `${(bull / total) * 100}%` }} />
        <div style={{ width: `${(neutral / total) * 100}%`, background: "#3a4655" }} />
        <div className="s" style={{ width: `${(bear / total) * 100}%` }} />
      </div>
      <div className="meter-legend">
        <span className="bull">{bull} bull</span>
        {neutral > 0 && <span className="mid">{neutral} neutral</span>}
        <span className="bear">{bear} bear</span>
      </div>
    </div>
  );
}

function TickerCard({ agg, action }: { agg: Agg; action?: React.ReactNode }) {
  const net = agg.bull - agg.bear;
  const lean = net > 0 ? "bull" : net < 0 ? "bear" : "neutral";
  const label = net > 0 ? "net bullish" : net < 0 ? "net bearish" : "mixed";
  return (
    <div className="card">
      <div className="card-head">
        <span className="ticker">{agg.ticker}</span>
        <span className={`chip ${lean}`}>{label}</span>
        {action && <span className="action">{action}</span>}
      </div>
      <Meter bull={agg.bull} bear={agg.bear} neutral={agg.neutral} />
      {agg.theses.slice(0, 2).map((t, i) => (
        <div className="thesis" key={i}>
          <div className="thesis-summary">
            <span className={`dot ${t.sentiment === "bullish" ? "bull" : t.sentiment === "bearish" ? "bear" : "neutral"}`} />
            {t.summary}
          </div>
          {t.reasoning && <div className="thesis-reason">{t.reasoning}</div>}
          <div className="thesis-foot">
            <span>{(t.confidence * 100).toFixed(0)}% conf</span>
            <a href={t.permalink} target="_blank" rel="noreferrer">source ↗</a>
          </div>
        </div>
      ))}
    </div>
  );
}

function useLocalList(key: string): [string[], (t: string) => void, (t: string) => void] {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved) setList(JSON.parse(saved));
  }, [key]);
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(list));
  }, [key, list]);
  const add = (t: string) => {
    const v = t.trim().toUpperCase();
    setList((l) => (v && !l.includes(v) ? [...l, v] : l));
  };
  const remove = (t: string) => setList((l) => l.filter((x) => x !== t));
  return [list, add, remove];
}

function AddForm({ onAdd, placeholder }: { onAdd: (t: string) => void; placeholder: string }) {
  const [v, setV] = useState("");
  return (
    <form className="addform" onSubmit={(e) => { e.preventDefault(); onAdd(v); setV(""); }}>
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      <button type="submit">Add</button>
    </form>
  );
}

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!now) return <div className="clock">--:--:--</div>;
  return (
    <>
      <div className="clock">{now.toLocaleTimeString("en-US", { hour12: false })}</div>
      <div className="date">{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
    </>
  );
}

export default function Dashboard({ theses }: { theses: ThesisRow[] }) {
  const [holdings, addHolding, removeHolding] = useLocalList("holdings");
  const [watchlist, addWatch, removeWatch] = useLocalList("watchlist");
  const byTicker = useMemo(() => aggregate(theses), [theses]);

  const total = { bull: 0, bear: 0, neutral: 0 };
  for (const t of theses) {
    if (t.sentiment === "bullish") total.bull++;
    else if (t.sentiment === "bearish") total.bear++;
    else total.neutral++;
  }

  const trending = useMemo(() => {
    return [...byTicker.values()]
      .filter((a) => !holdings.includes(a.ticker) && !watchlist.includes(a.ticker))
      .sort((a, b) => b.theses.length - a.theses.length)
      .slice(0, 8);
  }, [byTicker, holdings, watchlist]);

  const emptyAgg = (ticker: string): Agg => byTicker.get(ticker) ?? { ticker, theses: [], bull: 0, bear: 0, neutral: 0 };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><span>◆</span></div>
          <div>
            <div className="brand-name">Sentiment Desk</div>
            <div className="brand-sub">Reddit Alpha</div>
          </div>
        </div>

        <nav className="nav">
          <div className="nav-label">Desk</div>
          <a href="#holdings">Your Holdings <span className="count">{holdings.length}</span></a>
          <a href="#trending">Trending Ideas <span className="count">{trending.length}</span></a>
          <a href="#watchlist">Watchlist <span className="count">{watchlist.length}</span></a>
        </nav>

        <div className="market-status">
          <div className="row"><span className="dot" /> Live feed · {theses.length} theses</div>
          <Clock />
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">Morning Briefing</div>
            <h1 className="h1">What Reddit is saying <em>about your book.</em></h1>
          </div>
          <div className="mood">
            <div className="mood-label">Aggregate Sentiment</div>
            <Meter bull={total.bull} bear={total.bear} neutral={total.neutral} />
          </div>
        </header>

        <section className="section" id="holdings">
          <div className="section-head">
            <span className="section-num">01</span>
            <h2 className="section-title">Your Holdings</h2>
            <span className="section-desc">Stocks you own · sentiment & latest theses</span>
          </div>
          <AddForm onAdd={addHolding} placeholder="Add a holding, e.g. NVDA" />
          {holdings.length === 0 ? (
            <div className="empty">No holdings yet. Add a ticker you own to track sentiment on it.</div>
          ) : (
            <div className="grid">
              {holdings.map((t) => (
                <TickerCard
                  key={t}
                  agg={emptyAgg(t)}
                  action={<button className="iconbtn danger" onClick={() => removeHolding(t)}>Remove</button>}
                />
              ))}
            </div>
          )}
        </section>

        <section className="section" id="trending">
          <div className="section-head">
            <span className="section-num">02</span>
            <h2 className="section-title">Trending New Ideas</h2>
            <span className="section-desc">Most-discussed tickers you don&apos;t hold yet</span>
          </div>
          {trending.length === 0 ? (
            <div className="empty">Nothing trending outside your book right now.</div>
          ) : (
            <div className="trend-list">
              {trending.map((a, i) => {
                const net = a.bull - a.bear;
                return (
                  <div className="trend-row" key={a.ticker}>
                    <span className="trend-rank">{String(i + 1).padStart(2, "0")}</span>
                    <span className="trend-ticker">{a.ticker}</span>
                    <div className="trend-meter"><Meter bull={a.bull} bear={a.bear} neutral={a.neutral} /></div>
                    <span className="trend-count">{a.theses.length} {a.theses.length === 1 ? "thesis" : "theses"} · {net >= 0 ? "+" : ""}{net}</span>
                    <button className="iconbtn" onClick={() => addWatch(a.ticker)}>+ Watchlist</button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="section" id="watchlist">
          <div className="section-head">
            <span className="section-num">03</span>
            <h2 className="section-title">Watchlist</h2>
            <span className="section-desc">Ideas you&apos;re tracking</span>
          </div>
          <AddForm onAdd={addWatch} placeholder="Add to watchlist, e.g. TSLA" />
          {watchlist.length === 0 ? (
            <div className="empty">Your watchlist is empty. Add a trending idea above to follow its sentiment.</div>
          ) : (
            <div className="grid">
              {watchlist.map((t) => (
                <TickerCard
                  key={t}
                  agg={emptyAgg(t)}
                  action={<button className="iconbtn danger" onClick={() => removeWatch(t)}>Remove</button>}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
