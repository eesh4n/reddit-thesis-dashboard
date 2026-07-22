# Sentiment Desk

A morning briefing on what Reddit is actually saying about your stocks — not vibes, not rocket emojis, but structured investment theses pulled out of daily chatter across finance subreddits by an LLM, ranked, tracked over time, and checked against real price data.

## What it does

**Daily scraping + extraction pipeline**
- Pulls fresh posts every morning from 11 finance subreddits (r/wallstreetbets, r/stocks, r/investing, r/options, r/ValueInvesting, r/StockMarket, r/SecurityAnalysis, and more)
- Feeds candidate posts through Gemini in batches to extract genuine, forward-looking investment theses — ticker, one-line summary, reasoning, sentiment, confidence score
- Filters out trade diaries, P&L screenshots, memes, and "should I buy?" posts — the prompt only keeps arguments a stranger could evaluate
- Captures the ticker's real market price at the exact moment each thesis is extracted, laying the groundwork for backtesting whether Reddit sentiment is ever actually predictive
- Runs fully unattended via a scheduled task; recovers gracefully from rate limits, network hiccups, and partial failures instead of losing a day's backlog

**Dashboard**
- Morning briefing with an age- and confidence-weighted sentiment score (so a month-old hyped post doesn't outweigh what dropped an hour ago)
- "What changed since yesterday" digest of newly trending tickers
- Top Conviction feed — the highest-confidence ideas from the last 24–72h, genuinely windowed by when the post went up
- Holdings and Watchlist tracking with bearish-spike alerts and a dedicated alerts page
- Trending Ideas ranked by discussion volume

**Per-ticker pages**
- Full thesis history, sortable and filterable by time range, subreddit, and sentiment
- Sentiment-vs-price sparkline with a divergence flag when the crowd and the market are moving in opposite directions
- Author-deduped consensus badges, related-ticker cross-links, personal notes, and thumbs up/down feedback on each extraction

**Also included**
- Full-text search across every thesis ever extracted
- Side-by-side comparison view for up to 3 tickers
- An extraction quota dashboard tracking daily API usage and worker run history
- Real accounts (email/password + password reset) or a one-click guest mode with no sign-up required

## Stack

- **App:** Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS v4
- **Database:** PostgreSQL via Prisma 7, hosted on Supabase
- **Auth:** NextAuth v5 (credentials + guest cookie fallback)
- **Email:** Resend
- **Worker:** Python (requests, psycopg2, google-genai), scheduled via Windows Task Scheduler
- **Price/market data:** Yahoo Finance's public chart endpoint
- **Hosting:** Vercel

## Project structure

```
app/      Next.js dashboard — pages, API routes, Prisma schema
worker/   Python scraper + Gemini extraction pipeline, run daily
```

## Running locally

**App**
```bash
cd app
npm install
npx prisma migrate deploy
npm run dev
```

**Worker**
```bash
cd worker
pip install -r requirements.txt
python run_daily.py
```

Both need a `.env` with `DATABASE_URL` pointing at the same Postgres instance. The app additionally needs `AUTH_SECRET` and `RESEND_API_KEY`; the worker needs `GEMINI_API_KEY`.

## Testing

```bash
cd worker
pytest
```
