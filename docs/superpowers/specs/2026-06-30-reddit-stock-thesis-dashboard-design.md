# Reddit Stock-Thesis Dashboard — v1 Design

## Goal

Build a dashboard that surfaces stock theses and sentiment extracted from Reddit, so a user can:
- Track current opinion/outlook on stocks they already own (portfolio-first view)
- Discover new investment ideas trending in retail discussion

This is intended as a shareable product / eventual SaaS, but v1 is scoped tightly to prove the core pipeline.

## Explicitly out of scope for v1

- **Twitter/X ingestion** — official API is paid/rate-limited; revisit once budget is decided. Reddit only for now.
- **Account/source discovery algorithm** — the system that automatically finds new credible accounts/subreddits to follow. v1 uses a manually curated subreddit list. Discovery is a separate future sub-project.
- **Billing, multi-tenant scaling hardening** — auth exists (so the data model is multi-user-ready) but no payment/plan logic yet.
- E2E test infra — manual verification only for v1.

## Architecture

**Option chosen: Next.js + Python scraper sidecar.**

- **Next.js app (TypeScript)**: dashboard UI, auth (Auth.js, email/magic-link), user portfolios, API routes reading from Postgres via Prisma.
- **Python worker**: standalone scheduled script/service (hosting/cron mechanism TBD later) that:
  1. Pulls new posts/comments from the curated subreddit list via PRAW
  2. Sends each candidate post to an LLM with a structured-extraction prompt to get ticker(s), thesis summary, sentiment, confidence
  3. Writes structured results to Postgres
- **Postgres**: shared database. Python worker writes via a simple client (no ORM coupling required); Next.js reads via Prisma.

Rationale: Python has the strongest libraries for Reddit ingestion (PRAW) and LLM/data work; Next.js gives the best SaaS-grade frontend/auth/API story. The boundary is clean — the worker only writes to Postgres, everything else lives in Next.js.

## Data Sources

- **Reddit only**, via PRAW (free, well-documented API).
- Curated seed subreddit list: r/wallstreetbets, r/stocks, r/investing, r/options, r/SecurityAnalysis.

## Extraction Method

LLM-based extraction (not regex/keyword rules). Each candidate post/comment is sent to an LLM with a prompt that returns structured output: ticker(s) mentioned, thesis summary, sentiment (bullish/bearish/neutral), confidence. Posts with no ticker mentions are discarded after extraction.

## Data Model (Postgres)

- `users` — auth-managed user accounts
- `portfolios` (user_id, ticker) — tickers a user owns/follows
- `subreddit_sources` (name, enabled) — the curated source list
- `raw_posts` (id, subreddit, author, permalink, text, posted_at, fetched_at) — deduplicated by Reddit post/comment id
- `theses` (id, raw_post_id, ticker, summary, sentiment, confidence, extracted_at) — one post can yield multiple theses for multi-ticker posts
- `failed_extractions` (raw_post_id, error, attempted_at) — failed LLM calls logged here rather than silently dropped

### Key dashboard queries
- Per-ticker sentiment trend: aggregate `theses` over time for a given ticker
- Portfolio view: join `portfolios` → `theses` by ticker
- Trending new ideas: tickers with high recent thesis volume/sentiment shift, excluding tickers already in the user's portfolio

## Pipeline & Error Handling

- Worker runs on a daily schedule, tracks last-seen post id/timestamp per subreddit to avoid reprocessing.
- LLM extraction calls wrapped with retry logic for rate limits/timeouts.
- Failed extractions are logged to `failed_extractions` instead of being silently dropped.

## Dashboard UX

**Portfolio-first view**: user enters/manages their holdings; dashboard prioritizes sentiment/theses for those tickers. A separate "trending new ideas" section surfaces tickers gaining thesis volume/sentiment momentum that aren't already in the user's portfolio.

## Auth

Auth.js with email/magic-link sign-in. Enough to support multi-user accounts and per-user portfolios without building custom auth infrastructure.

## Hosting

Not finalized — architecture is hosting-agnostic. Likely direction: Next.js on Vercel, Python worker on a small always-on host (Railway/Fly.io/EC2) triggered by cron, managed Postgres (Supabase/Neon). To be decided at implementation/deployment time.

## Testing Approach

- Python worker: unit tests on extraction prompt parsing (mock LLM responses → verify correct DB rows) and on dedup logic.
- Next.js: tests on aggregation queries (sentiment trend, trending tickers) against seeded test data.
- No e2e test infra for v1; manual dashboard verification is sufficient at this stage.

## Future sub-projects (not in this spec)

1. Account/source discovery algorithm (auto-find credible accounts/subreddits)
2. Twitter/X ingestion
3. Billing / SaaS hardening for true multi-tenant launch
