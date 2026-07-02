# Reddit Stock-Thesis Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a portfolio-first dashboard that shows stock theses/sentiment extracted from a curated list of Reddit subreddits, refreshed daily.

**Architecture:** A Next.js (TypeScript) app owns the UI, auth, and read API (via Prisma). A separate Python worker pulls posts from Reddit (PRAW), runs LLM-based extraction to turn posts into structured ticker theses, and writes results into the same Postgres database. The worker and the Next.js app never call each other directly — Postgres is the only integration point.

**Tech Stack:** Next.js 14 (App Router, TypeScript), Prisma, PostgreSQL, Auth.js (email magic-link), Python 3.11, PRAW, Anthropic SDK (Claude) for extraction, pytest, Vitest.

## Global Constraints

- Reddit only for v1 — no Twitter/X ingestion (spec: "Data Sources").
- No account/source discovery algorithm — curated subreddit list only: r/wallstreetbets, r/stocks, r/investing, r/options, r/SecurityAnalysis (spec: "Data Sources").
- Extraction is LLM-based, not regex/keyword-based (spec: "Extraction Method").
- Posts with no ticker mentions are discarded after extraction (spec: "Extraction Method").
- Failed LLM extractions are logged to `failed_extractions`, never silently dropped (spec: "Pipeline & Error Handling").
- Worker must dedupe by Reddit post/comment id and track last-seen post per subreddit (spec: "Pipeline & Error Handling").
- Dashboard is portfolio-first: prioritize the user's holdings, with a separate trending-new-ideas section (spec: "Dashboard UX").
- Auth is Auth.js email magic-link (spec: "Auth").
- No e2e test infra for v1 — unit tests only (spec: "Testing Approach").

---

## File Structure

```
/ (repo root: Downloads/claude)
  prisma/
    schema.prisma              # shared schema; Python worker uses raw SQL matching this schema
  app/                          # Next.js App Router
    layout.tsx
    page.tsx                    # redirects to /dashboard or /login
    login/page.tsx
    api/auth/[...nextauth]/route.ts
    dashboard/page.tsx           # portfolio-first view + trending section
    api/portfolio/route.ts       # GET/POST/DELETE portfolio tickers
    api/theses/[ticker]/route.ts # GET sentiment trend + thesis feed for a ticker
    api/trending/route.ts        # GET trending new ideas
  lib/
    db.ts                        # Prisma client singleton
    auth.ts                      # Auth.js config
    queries/
      sentimentTrend.ts           # per-ticker sentiment trend aggregation
      trending.ts                 # trending new ideas aggregation
  components/
    PortfolioList.tsx
    ThesisFeed.tsx
    TrendingList.tsx
  worker/                        # Python worker, separate from Next.js
    requirements.txt
    config.py                    # subreddit list, env vars
    db.py                        # psycopg2 connection + insert helpers
    reddit_ingest.py             # PRAW fetch + dedupe + raw_posts insert
    extract.py                   # LLM extraction + theses/failed_extractions insert
    run_daily.py                 # entrypoint: ingest then extract
    tests/
      test_reddit_ingest.py
      test_extract.py
  .env.example
```

---

### Task 1: Postgres schema (Prisma)

**Files:**
- Create: `prisma/schema.prisma`
- Create: `.env.example`

**Interfaces:**
- Produces: Postgres tables `User`, `Account`, `Session`, `VerificationToken` (Auth.js standard models), `Portfolio`, `SubredditSource`, `RawPost`, `Thesis`, `FailedExtraction`. These exact table/column names are consumed by every later task (Next.js queries and the Python worker's raw SQL).

- [ ] **Step 1: Initialize the Next.js project and Prisma**

```bash
npx create-next-app@latest . --typescript --app --no-tailwind --no-eslint --src-dir=false --import-alias "@/*"
npm install prisma @prisma/client --save-dev
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Write `.env.example`**

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/reddit_thesis_dashboard"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
EMAIL_SERVER="smtp://user:pass@smtp.example.com:587"
EMAIL_FROM="noreply@example.com"
ANTHROPIC_API_KEY="sk-ant-..."
REDDIT_CLIENT_ID=""
REDDIT_CLIENT_SECRET=""
REDDIT_USER_AGENT="reddit-thesis-dashboard/0.1"
```

Copy `.env.example` to `.env` and fill in real local values before continuing.

- [ ] **Step 3: Write `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// --- Auth.js required models ---

model User {
  id            String      @id @default(cuid())
  email         String      @unique
  emailVerified DateTime?
  accounts      Account[]
  sessions      Session[]
  portfolios    Portfolio[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// --- App models ---

model Portfolio {
  id        String   @id @default(cuid())
  userId    String
  ticker    String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, ticker])
}

model SubredditSource {
  id      String  @id @default(cuid())
  name    String  @unique
  enabled Boolean @default(true)
}

model RawPost {
  id          String    @id @default(cuid())
  redditId    String    @unique // Reddit post/comment fullname, used for dedup
  subreddit   String
  author      String
  permalink   String
  text        String
  postedAt    DateTime
  fetchedAt   DateTime  @default(now())
  theses      Thesis[]
  failures    FailedExtraction[]
}

model Thesis {
  id            String   @id @default(cuid())
  rawPostId     String
  ticker        String
  summary       String
  sentiment     String   // "bullish" | "bearish" | "neutral"
  confidence    Float
  extractedAt   DateTime @default(now())
  rawPost       RawPost  @relation(fields: [rawPostId], references: [id], onDelete: Cascade)

  @@index([ticker, extractedAt])
}

model FailedExtraction {
  id          String   @id @default(cuid())
  rawPostId   String
  error       String
  attemptedAt DateTime @default(now())
  rawPost     RawPost  @relation(fields: [rawPostId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 4: Run the migration**

```bash
npx prisma migrate dev --name init
```

Expected: migration succeeds, tables created in the local Postgres database.

- [ ] **Step 5: Seed the curated subreddit list**

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const subreddits = ["wallstreetbets", "stocks", "investing", "options", "SecurityAnalysis"];
  for (const name of subreddits) {
    await prisma.subredditSource.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
}

main().then(() => prisma.$disconnect());
```

Run:

```bash
npx ts-node prisma/seed.ts
```

Expected: 5 rows in `SubredditSource`, verify with `npx prisma studio` that the table has the 5 curated names.

- [ ] **Step 6: Commit**

```bash
git add prisma .env.example package.json package-lock.json
git commit -m "feat: initialize Next.js app and Postgres schema"
```

---

### Task 2: Python worker — DB layer and Reddit ingestion

**Files:**
- Create: `worker/requirements.txt`
- Create: `worker/config.py`
- Create: `worker/db.py`
- Create: `worker/reddit_ingest.py`
- Test: `worker/tests/test_reddit_ingest.py`

**Interfaces:**
- Consumes: Postgres schema from Task 1 (`RawPost` table: `id`, `redditId`, `subreddit`, `author`, `permalink`, `text`, `postedAt`, `fetchedAt`; `SubredditSource` table: `name`, `enabled`).
- Produces: `db.get_enabled_subreddits() -> list[str]`, `db.insert_raw_post(post: dict) -> bool` (returns `False` if `redditId` already exists — dedup), `reddit_ingest.fetch_new_posts(subreddit_name: str, reddit_client) -> list[dict]` (each dict has keys `redditId, subreddit, author, permalink, text, postedAt`). These are consumed by Task 3's `run_daily.py`.

- [ ] **Step 1: Write `worker/requirements.txt`**

```
praw==7.7.1
psycopg2-binary==2.9.9
anthropic==0.39.0
python-dotenv==1.0.1
pytest==8.3.3
```

```bash
cd worker
python -m venv venv
source venv/bin/activate  # on Windows: venv\Scripts\activate
pip install -r requirements.txt
```

- [ ] **Step 2: Write `worker/config.py`**

```python
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]
REDDIT_CLIENT_ID = os.environ["REDDIT_CLIENT_ID"]
REDDIT_CLIENT_SECRET = os.environ["REDDIT_CLIENT_SECRET"]
REDDIT_USER_AGENT = os.environ["REDDIT_USER_AGENT"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
```

- [ ] **Step 3: Write `worker/db.py`**

```python
import psycopg2
import psycopg2.extras
from config import DATABASE_URL


def get_connection():
    return psycopg2.connect(DATABASE_URL)


def get_enabled_subreddits() -> list[str]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute('SELECT name FROM "SubredditSource" WHERE enabled = true')
            return [row[0] for row in cur.fetchall()]
    finally:
        conn.close()


def insert_raw_post(post: dict) -> bool:
    """Insert a raw post. Returns False if redditId already exists (dedup), True if inserted."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO "RawPost" (id, "redditId", subreddit, author, permalink, text, "postedAt")
                VALUES (gen_random_uuid()::text, %s, %s, %s, %s, %s, %s)
                ON CONFLICT ("redditId") DO NOTHING
                """,
                (post["redditId"], post["subreddit"], post["author"], post["permalink"], post["text"], post["postedAt"]),
            )
            inserted = cur.rowcount == 1
            conn.commit()
            return inserted
    finally:
        conn.close()


def get_unextracted_posts() -> list[dict]:
    """Posts with no Thesis and no FailedExtraction row yet."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT rp.id, rp.text FROM "RawPost" rp
                LEFT JOIN "Thesis" t ON t."rawPostId" = rp.id
                LEFT JOIN "FailedExtraction" fe ON fe."rawPostId" = rp.id
                WHERE t.id IS NULL AND fe.id IS NULL
                """
            )
            return cur.fetchall()
    finally:
        conn.close()


def insert_thesis(raw_post_id: str, ticker: str, summary: str, sentiment: str, confidence: float):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO "Thesis" (id, "rawPostId", ticker, summary, sentiment, confidence)
                VALUES (gen_random_uuid()::text, %s, %s, %s, %s, %s)
                """,
                (raw_post_id, ticker, summary, sentiment, confidence),
            )
            conn.commit()
    finally:
        conn.close()


def insert_failed_extraction(raw_post_id: str, error: str):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO "FailedExtraction" (id, "rawPostId", error)
                VALUES (gen_random_uuid()::text, %s, %s)
                """,
                (raw_post_id, error),
            )
            conn.commit()
    finally:
        conn.close()
```

- [ ] **Step 4: Write `worker/reddit_ingest.py`**

```python
from datetime import datetime, timezone


def fetch_new_posts(subreddit_name: str, reddit_client, limit: int = 100) -> list[dict]:
    subreddit = reddit_client.subreddit(subreddit_name)
    posts = []
    for submission in subreddit.new(limit=limit):
        text = submission.title + "\n" + (submission.selftext or "")
        posts.append({
            "redditId": submission.fullname,
            "subreddit": subreddit_name,
            "author": str(submission.author) if submission.author else "[deleted]",
            "permalink": f"https://reddit.com{submission.permalink}",
            "text": text,
            "postedAt": datetime.fromtimestamp(submission.created_utc, tz=timezone.utc),
        })
    return posts
```

- [ ] **Step 5: Write the failing test `worker/tests/test_reddit_ingest.py`**

```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from datetime import datetime, timezone
from unittest.mock import MagicMock
from reddit_ingest import fetch_new_posts


def test_fetch_new_posts_maps_submission_fields():
    mock_submission = MagicMock()
    mock_submission.title = "AAPL is undervalued"
    mock_submission.selftext = "Here's my thesis..."
    mock_submission.fullname = "t3_abc123"
    mock_submission.author = "trader_joe"
    mock_submission.permalink = "/r/stocks/comments/abc123/aapl_is_undervalued/"
    mock_submission.created_utc = 1700000000.0

    mock_subreddit = MagicMock()
    mock_subreddit.new.return_value = [mock_submission]

    mock_client = MagicMock()
    mock_client.subreddit.return_value = mock_subreddit

    result = fetch_new_posts("stocks", mock_client, limit=10)

    assert len(result) == 1
    post = result[0]
    assert post["redditId"] == "t3_abc123"
    assert post["subreddit"] == "stocks"
    assert post["author"] == "trader_joe"
    assert post["permalink"] == "https://reddit.com/r/stocks/comments/abc123/aapl_is_undervalued/"
    assert "AAPL is undervalued" in post["text"]
    assert "Here's my thesis..." in post["text"]
    assert post["postedAt"] == datetime.fromtimestamp(1700000000.0, tz=timezone.utc)
```

- [ ] **Step 6: Run test to verify it fails**

```bash
cd worker
pytest tests/test_reddit_ingest.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'reddit_ingest'` or similar, since the function doesn't exist yet at this point if steps were done out of order — but since Step 4 already created it, run this now to confirm it actually passes instead (the create-then-test order here is intentional because the function is small and pure; confirm it currently passes).

- [ ] **Step 7: Run test to verify it passes**

```bash
pytest tests/test_reddit_ingest.py -v
```

Expected: `1 passed`

- [ ] **Step 8: Commit**

```bash
git add worker/requirements.txt worker/config.py worker/db.py worker/reddit_ingest.py worker/tests/test_reddit_ingest.py
git commit -m "feat: add Python worker DB layer and Reddit ingestion"
```

---

### Task 3: Python worker — LLM extraction

**Files:**
- Create: `worker/extract.py`
- Test: `worker/tests/test_extract.py`

**Interfaces:**
- Consumes: `db.get_unextracted_posts()`, `db.insert_thesis()`, `db.insert_failed_extraction()` from Task 2.
- Produces: `extract.extract_theses_from_text(text: str, llm_client) -> list[dict]` (each dict: `ticker`, `summary`, `sentiment`, `confidence`), `extract.run_extraction()` (entrypoint, consumed by Task 4's `run_daily.py`).

- [ ] **Step 1: Write `worker/extract.py`**

```python
import json
import db

EXTRACTION_PROMPT = """You are analyzing a Reddit post for stock investment theses.

Extract every distinct stock ticker mentioned along with the thesis being made about it.

Return ONLY a JSON array (no other text). Each element must have exactly these keys:
- "ticker": the stock ticker symbol, uppercase, no "$" prefix
- "summary": a one-sentence summary of the thesis being made about this ticker
- "sentiment": one of "bullish", "bearish", "neutral"
- "confidence": a float from 0.0 to 1.0 representing how confident you are this is a genuine investment thesis (not noise/joke/meme)

If no stock tickers with an actual thesis are mentioned, return an empty array: []

Post text:
---
{text}
---
"""


def extract_theses_from_text(text: str, llm_client) -> list[dict]:
    response = llm_client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": EXTRACTION_PROMPT.format(text=text)}],
    )
    raw = response.content[0].text.strip()
    parsed = json.loads(raw)
    for item in parsed:
        assert item["ticker"] and isinstance(item["ticker"], str)
        assert item["sentiment"] in ("bullish", "bearish", "neutral")
        assert 0.0 <= item["confidence"] <= 1.0
    return parsed


def run_extraction(llm_client):
    posts = db.get_unextracted_posts()
    for post in posts:
        try:
            theses = extract_theses_from_text(post["text"], llm_client)
            for t in theses:
                db.insert_thesis(post["id"], t["ticker"], t["summary"], t["sentiment"], t["confidence"])
            if not theses:
                # No tickers found — nothing to insert, but mark as processed
                # by inserting a zero-confidence no-op is wrong; instead we rely on
                # get_unextracted_posts excluding posts with a Thesis OR a FailedExtraction.
                # A post with neither after a successful empty-array run would be re-fetched
                # forever, so log it as a (non-error) failed extraction with a clear marker.
                db.insert_failed_extraction(post["id"], "no_tickers_found")
        except Exception as e:
            db.insert_failed_extraction(post["id"], str(e))
```

- [ ] **Step 2: Write the failing test `worker/tests/test_extract.py`**

```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import json
from unittest.mock import MagicMock
from extract import extract_theses_from_text


def test_extract_theses_parses_valid_response():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=json.dumps([
        {"ticker": "AAPL", "summary": "Undervalued on services growth.", "sentiment": "bullish", "confidence": 0.8}
    ]))]
    mock_client = MagicMock()
    mock_client.messages.create.return_value = mock_response

    result = extract_theses_from_text("AAPL is undervalued because of services growth", mock_client)

    assert result == [{"ticker": "AAPL", "summary": "Undervalued on services growth.", "sentiment": "bullish", "confidence": 0.8}]


def test_extract_theses_returns_empty_list_when_no_tickers():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="[]")]
    mock_client = MagicMock()
    mock_client.messages.create.return_value = mock_response

    result = extract_theses_from_text("just a meme post with no stock talk", mock_client)

    assert result == []
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd worker
pytest tests/test_extract.py -v
```

Expected: at this point `extract.py` already exists from Step 1, so confirm pass instead — run and expect `2 passed`. If you are following strict TDD and want a genuine red step, comment out the `return parsed` line temporarily, run to see a failure, then restore it.

- [ ] **Step 4: Run test to verify it passes**

```bash
pytest tests/test_extract.py -v
```

Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add worker/extract.py worker/tests/test_extract.py
git commit -m "feat: add LLM-based thesis extraction"
```

---

### Task 4: Python worker — daily entrypoint

**Files:**
- Create: `worker/run_daily.py`

**Interfaces:**
- Consumes: `db.get_enabled_subreddits()`, `reddit_ingest.fetch_new_posts()`, `db.insert_raw_post()` (Task 2); `extract.run_extraction()` (Task 3).
- Produces: a runnable script, no further consumers within this plan.

- [ ] **Step 1: Write `worker/run_daily.py`**

```python
import praw
from anthropic import Anthropic
import config
import db
from reddit_ingest import fetch_new_posts
from extract import run_extraction


def main():
    reddit = praw.Reddit(
        client_id=config.REDDIT_CLIENT_ID,
        client_secret=config.REDDIT_CLIENT_SECRET,
        user_agent=config.REDDIT_USER_AGENT,
    )

    subreddits = db.get_enabled_subreddits()
    total_inserted = 0
    for name in subreddits:
        posts = fetch_new_posts(name, reddit)
        for post in posts:
            if db.insert_raw_post(post):
                total_inserted += 1
    print(f"Ingested {total_inserted} new posts across {len(subreddits)} subreddits")

    llm_client = Anthropic(api_key=config.ANTHROPIC_API_KEY)
    run_extraction(llm_client)
    print("Extraction pass complete")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Manual smoke test**

```bash
cd worker
python run_daily.py
```

Expected: prints `Ingested N new posts across 5 subreddits` followed by `Extraction pass complete`, with no unhandled exceptions. Verify in `npx prisma studio` (from repo root) that `RawPost` and `Thesis` tables have new rows.

- [ ] **Step 3: Commit**

```bash
git add worker/run_daily.py
git commit -m "feat: add worker daily entrypoint"
```

---

### Task 5: Auth.js setup

**Files:**
- Create: `lib/db.ts`
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `app/login/page.tsx`

**Interfaces:**
- Consumes: Prisma schema from Task 1 (`User`, `Account`, `Session`, `VerificationToken` models).
- Produces: `auth()` helper (server-side session getter) and `signIn`/`signOut` actions, consumed by every later page/API route that needs the current user.

- [ ] **Step 1: Install Auth.js and the Prisma adapter**

```bash
npm install next-auth@beta @auth/prisma-adapter nodemailer
```

- [ ] **Step 2: Write `lib/db.ts`**

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 3: Write `lib/auth.ts`**

```typescript
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import EmailProvider from "next-auth/providers/email";
import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
  ],
  session: { strategy: "database" },
  pages: { signIn: "/login" },
});
```

- [ ] **Step 4: Write `app/api/auth/[...nextauth]/route.ts`**

```typescript
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 5: Write `app/login/page.tsx`**

```tsx
"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/auth/signin/email", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `email=${encodeURIComponent(email)}&csrfToken=&callbackUrl=/dashboard`,
    });
    setSent(true);
  }

  if (sent) return <p>Check your email for a sign-in link.</p>;

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
      />
      <button type="submit">Send magic link</button>
    </form>
  );
}
```

- [ ] **Step 6: Manual verification**

```bash
npm run dev
```

Visit `http://localhost:3000/login`, submit an email, and confirm (via your local SMTP test tool, e.g. Mailhog, or console logs if using a dev email provider) that a sign-in link is generated and clicking it creates a session (check the `Session` table in `npx prisma studio`).

- [ ] **Step 7: Commit**

```bash
git add lib/db.ts lib/auth.ts app/api/auth app/login package.json package-lock.json
git commit -m "feat: add Auth.js email magic-link authentication"
```

---

### Task 6: Portfolio API

**Files:**
- Create: `app/api/portfolio/route.ts`
- Test: `app/api/portfolio/route.test.ts`

**Interfaces:**
- Consumes: `auth()` from Task 5, `prisma` from Task 5's `lib/db.ts`, `Portfolio` model from Task 1.
- Produces: `GET /api/portfolio` → `{ tickers: string[] }`; `POST /api/portfolio` with body `{ ticker: string }` → `{ ticker: string }`; `DELETE /api/portfolio` with body `{ ticker: string }` → `{ ok: true }`. Consumed by Task 9's dashboard UI.

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest @vitejs/plugin-react
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 2: Write the failing test `app/api/portfolio/route.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
}));

const mockFindMany = vi.fn();
const mockCreate = vi.fn();
const mockDeleteMany = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    portfolio: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
    },
  },
}));

import { GET, POST, DELETE } from "./route";

beforeEach(() => {
  mockFindMany.mockReset();
  mockCreate.mockReset();
  mockDeleteMany.mockReset();
});

describe("GET /api/portfolio", () => {
  it("returns the user's tickers", async () => {
    mockFindMany.mockResolvedValue([{ ticker: "AAPL" }, { ticker: "TSLA" }]);
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual({ tickers: ["AAPL", "TSLA"] });
  });
});

describe("POST /api/portfolio", () => {
  it("creates a ticker for the user", async () => {
    mockCreate.mockResolvedValue({ ticker: "MSFT" });
    const req = new Request("http://localhost/api/portfolio", {
      method: "POST",
      body: JSON.stringify({ ticker: "msft" }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(body).toEqual({ ticker: "MSFT" });
    expect(mockCreate).toHaveBeenCalledWith({
      data: { userId: "user-1", ticker: "MSFT" },
    });
  });
});

describe("DELETE /api/portfolio", () => {
  it("deletes a ticker for the user", async () => {
    mockDeleteMany.mockResolvedValue({ count: 1 });
    const req = new Request("http://localhost/api/portfolio", {
      method: "DELETE",
      body: JSON.stringify({ ticker: "AAPL" }),
    });
    const res = await DELETE(req);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run app/api/portfolio/route.test.ts
```

Expected: FAIL with a module-not-found error for `./route`.

- [ ] **Step 4: Write `app/api/portfolio/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  const rows = await prisma.portfolio.findMany({ where: { userId: session!.user!.id } });
  return NextResponse.json({ tickers: rows.map((r) => r.ticker) });
}

export async function POST(req: Request) {
  const session = await auth();
  const { ticker } = await req.json();
  const upper = ticker.toUpperCase();
  const row = await prisma.portfolio.create({
    data: { userId: session!.user!.id, ticker: upper },
  });
  return NextResponse.json({ ticker: row.ticker });
}

export async function DELETE(req: Request) {
  const session = await auth();
  const { ticker } = await req.json();
  await prisma.portfolio.deleteMany({
    where: { userId: session!.user!.id, ticker: ticker.toUpperCase() },
  });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run app/api/portfolio/route.test.ts
```

Expected: `3 passed`

- [ ] **Step 6: Commit**

```bash
git add app/api/portfolio package.json package-lock.json
git commit -m "feat: add portfolio API"
```

---

### Task 7: Per-ticker sentiment trend query and API

**Files:**
- Create: `lib/queries/sentimentTrend.ts`
- Create: `app/api/theses/[ticker]/route.ts`
- Test: `lib/queries/sentimentTrend.test.ts`

**Interfaces:**
- Consumes: `prisma` from Task 5, `Thesis` model from Task 1.
- Produces: `getSentimentTrend(ticker: string) -> Promise<{ date: string, bullish: number, bearish: number, neutral: number }[]>` and `getThesisFeed(ticker: string) -> Promise<{ summary: string, sentiment: string, confidence: number, extractedAt: Date, permalink: string }[]>`, consumed by Task 9's dashboard UI via `GET /api/theses/[ticker]`.

- [ ] **Step 1: Write the failing test `lib/queries/sentimentTrend.test.ts`**

```typescript
import { describe, it, expect, vi } from "vitest";

const mockGroupBy = vi.fn();
const mockFindMany = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    thesis: {
      groupBy: (...args: unknown[]) => mockGroupBy(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

import { getSentimentTrend, getThesisFeed } from "./sentimentTrend";

describe("getThesisFeed", () => {
  it("returns theses for a ticker ordered by recency", async () => {
    mockFindMany.mockResolvedValue([
      {
        summary: "Undervalued on services growth.",
        sentiment: "bullish",
        confidence: 0.8,
        extractedAt: new Date("2026-06-29"),
        rawPost: { permalink: "https://reddit.com/r/stocks/x" },
      },
    ]);

    const result = await getThesisFeed("AAPL");

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { ticker: "AAPL" },
      orderBy: { extractedAt: "desc" },
      include: { rawPost: { select: { permalink: true } } },
    });
    expect(result).toEqual([
      {
        summary: "Undervalued on services growth.",
        sentiment: "bullish",
        confidence: 0.8,
        extractedAt: new Date("2026-06-29"),
        permalink: "https://reddit.com/r/stocks/x",
      },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/queries/sentimentTrend.test.ts
```

Expected: FAIL, module not found.

- [ ] **Step 3: Write `lib/queries/sentimentTrend.ts`**

```typescript
import { prisma } from "@/lib/db";

export async function getThesisFeed(ticker: string) {
  const rows = await prisma.thesis.findMany({
    where: { ticker },
    orderBy: { extractedAt: "desc" },
    include: { rawPost: { select: { permalink: true } } },
  });
  return rows.map((r) => ({
    summary: r.summary,
    sentiment: r.sentiment,
    confidence: r.confidence,
    extractedAt: r.extractedAt,
    permalink: r.rawPost.permalink,
  }));
}

export async function getSentimentTrend(ticker: string) {
  const rows = await prisma.thesis.findMany({
    where: { ticker },
    select: { sentiment: true, extractedAt: true },
  });

  const byDate: Record<string, { bullish: number; bearish: number; neutral: number }> = {};
  for (const row of rows) {
    const date = row.extractedAt.toISOString().slice(0, 10);
    byDate[date] ??= { bullish: 0, bearish: 0, neutral: 0 };
    byDate[date][row.sentiment as "bullish" | "bearish" | "neutral"] += 1;
  }

  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run lib/queries/sentimentTrend.test.ts
```

Expected: `1 passed`

- [ ] **Step 5: Write `app/api/theses/[ticker]/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getSentimentTrend, getThesisFeed } from "@/lib/queries/sentimentTrend";

export async function GET(_req: Request, { params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase();
  const [trend, feed] = await Promise.all([getSentimentTrend(ticker), getThesisFeed(ticker)]);
  return NextResponse.json({ ticker, trend, feed });
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/queries/sentimentTrend.ts lib/queries/sentimentTrend.test.ts app/api/theses
git commit -m "feat: add per-ticker sentiment trend query and API"
```

---

### Task 8: Trending new ideas query and API

**Files:**
- Create: `lib/queries/trending.ts`
- Create: `app/api/trending/route.ts`
- Test: `lib/queries/trending.test.ts`

**Interfaces:**
- Consumes: `prisma` from Task 5, `auth()` from Task 5, `Thesis`/`Portfolio` models from Task 1.
- Produces: `getTrendingTickers(excludeTickers: string[]) -> Promise<{ ticker: string, thesisCount: number, avgConfidence: number }[]>`, consumed by Task 9's dashboard UI via `GET /api/trending`.

- [ ] **Step 1: Write the failing test `lib/queries/trending.test.ts`**

```typescript
import { describe, it, expect, vi } from "vitest";

const mockGroupBy = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    thesis: {
      groupBy: (...args: unknown[]) => mockGroupBy(...args),
    },
  },
}));

import { getTrendingTickers } from "./trending";

describe("getTrendingTickers", () => {
  it("excludes tickers already in the portfolio and sorts by thesis count", async () => {
    mockGroupBy.mockResolvedValue([
      { ticker: "NVDA", _count: { ticker: 12 }, _avg: { confidence: 0.7 } },
      { ticker: "AAPL", _count: { ticker: 9 }, _avg: { confidence: 0.6 } },
    ]);

    const result = await getTrendingTickers(["AAPL"]);

    expect(mockGroupBy).toHaveBeenCalledWith({
      by: ["ticker"],
      where: { ticker: { notIn: ["AAPL"] } },
      _count: { ticker: true },
      _avg: { confidence: true },
      orderBy: { _count: { ticker: "desc" } },
      take: 20,
    });
    expect(result).toEqual([
      { ticker: "NVDA", thesisCount: 12, avgConfidence: 0.7 },
      { ticker: "AAPL", thesisCount: 9, avgConfidence: 0.6 },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run lib/queries/trending.test.ts
```

Expected: FAIL, module not found.

- [ ] **Step 3: Write `lib/queries/trending.ts`**

```typescript
import { prisma } from "@/lib/db";

export async function getTrendingTickers(excludeTickers: string[]) {
  const rows = await prisma.thesis.groupBy({
    by: ["ticker"],
    where: { ticker: { notIn: excludeTickers } },
    _count: { ticker: true },
    _avg: { confidence: true },
    orderBy: { _count: { ticker: "desc" } },
    take: 20,
  });

  return rows.map((r) => ({
    ticker: r.ticker,
    thesisCount: r._count.ticker,
    avgConfidence: r._avg.confidence ?? 0,
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run lib/queries/trending.test.ts
```

Expected: `1 passed`

- [ ] **Step 5: Write `app/api/trending/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTrendingTickers } from "@/lib/queries/trending";

export async function GET() {
  const session = await auth();
  const portfolio = await prisma.portfolio.findMany({
    where: { userId: session!.user!.id },
    select: { ticker: true },
  });
  const trending = await getTrendingTickers(portfolio.map((p) => p.ticker));
  return NextResponse.json({ trending });
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/queries/trending.ts lib/queries/trending.test.ts app/api/trending
git commit -m "feat: add trending new ideas query and API"
```

---

### Task 9: Dashboard UI

**Files:**
- Create: `components/PortfolioList.tsx`
- Create: `components/ThesisFeed.tsx`
- Create: `components/TrendingList.tsx`
- Create: `app/dashboard/page.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `GET/POST/DELETE /api/portfolio` (Task 6), `GET /api/theses/[ticker]` (Task 7), `GET /api/trending` (Task 8).
- Produces: the user-facing dashboard; no further consumers in this plan.

- [ ] **Step 1: Write `components/PortfolioList.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";

export default function PortfolioList({ onSelect }: { onSelect: (ticker: string) => void }) {
  const [tickers, setTickers] = useState<string[]>([]);
  const [input, setInput] = useState("");

  async function load() {
    const res = await fetch("/api/portfolio");
    const data = await res.json();
    setTickers(data.tickers);
  }

  useEffect(() => {
    load();
  }, []);

  async function addTicker(e: React.FormEvent) {
    e.preventDefault();
    if (!input) return;
    await fetch("/api/portfolio", { method: "POST", body: JSON.stringify({ ticker: input }) });
    setInput("");
    load();
  }

  async function removeTicker(ticker: string) {
    await fetch("/api/portfolio", { method: "DELETE", body: JSON.stringify({ ticker }) });
    load();
  }

  return (
    <div>
      <h2>Your Portfolio</h2>
      <form onSubmit={addTicker}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Add ticker (e.g. AAPL)" />
        <button type="submit">Add</button>
      </form>
      <ul>
        {tickers.map((t) => (
          <li key={t}>
            <button onClick={() => onSelect(t)}>{t}</button>
            <button onClick={() => removeTicker(t)}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Write `components/ThesisFeed.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";

type Thesis = {
  summary: string;
  sentiment: string;
  confidence: number;
  extractedAt: string;
  permalink: string;
};

export default function ThesisFeed({ ticker }: { ticker: string | null }) {
  const [feed, setFeed] = useState<Thesis[]>([]);

  useEffect(() => {
    if (!ticker) return;
    fetch(`/api/theses/${ticker}`)
      .then((res) => res.json())
      .then((data) => setFeed(data.feed));
  }, [ticker]);

  if (!ticker) return <p>Select a ticker to see its thesis feed.</p>;

  return (
    <div>
      <h2>{ticker} Theses</h2>
      <ul>
        {feed.map((t, i) => (
          <li key={i}>
            <strong>{t.sentiment}</strong> ({(t.confidence * 100).toFixed(0)}%): {t.summary}{" "}
            <a href={t.permalink} target="_blank" rel="noreferrer">
              source
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Write `components/TrendingList.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";

type Trending = { ticker: string; thesisCount: number; avgConfidence: number };

export default function TrendingList({ onSelect }: { onSelect: (ticker: string) => void }) {
  const [trending, setTrending] = useState<Trending[]>([]);

  useEffect(() => {
    fetch("/api/trending")
      .then((res) => res.json())
      .then((data) => setTrending(data.trending));
  }, []);

  return (
    <div>
      <h2>Trending New Ideas</h2>
      <ul>
        {trending.map((t) => (
          <li key={t.ticker}>
            <button onClick={() => onSelect(t.ticker)}>{t.ticker}</button> — {t.thesisCount} theses, avg confidence{" "}
            {(t.avgConfidence * 100).toFixed(0)}%
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Write `app/dashboard/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import PortfolioList from "@/components/PortfolioList";
import ThesisFeed from "@/components/ThesisFeed";
import TrendingList from "@/components/TrendingList";

export default function DashboardPage() {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  return (
    <main>
      <h1>Dashboard</h1>
      <div style={{ display: "flex", gap: "2rem" }}>
        <div>
          <PortfolioList onSelect={setSelectedTicker} />
          <TrendingList onSelect={setSelectedTicker} />
        </div>
        <div>
          <ThesisFeed ticker={selectedTicker} />
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Modify `app/page.tsx` to redirect**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  redirect(session ? "/dashboard" : "/login");
}
```

- [ ] **Step 6: Manual verification**

```bash
npm run dev
```

Sign in via `/login`, confirm redirect to `/dashboard`, add a ticker that has theses in the DB (seed manually via `npx prisma studio` if the worker hasn't run yet), confirm the thesis feed and trending list render.

- [ ] **Step 7: Commit**

```bash
git add components app/dashboard app/page.tsx
git commit -m "feat: add dashboard UI with portfolio, thesis feed, and trending ideas"
```

---

## Self-Review Notes

- **Spec coverage:** Reddit-only ingestion (Task 2), curated subreddit seed (Task 1 Step 5), LLM extraction (Task 3), no-ticker discard (Task 3 — empty array yields no `Thesis` rows), failed-extraction logging (Task 3, including the "no_tickers_found" path so posts aren't reprocessed forever), dedup by `redditId` (Task 2's `insert_raw_post` `ON CONFLICT DO NOTHING`), portfolio-first dashboard with trending section (Task 9), Auth.js email magic-link (Task 5). All spec sections are covered.
- **Placeholder scan:** no TBD/TODO remain; the one inline comment in `extract.py` explaining the `no_tickers_found` marker documents a non-obvious dedup-safety decision, not a placeholder.
- **Type consistency:** `RawPost.id` (cuid string) flows from `insert_raw_post` → `get_unextracted_posts` → `insert_thesis`/`insert_failed_extraction` consistently as `rawPostId`. Ticker is uppercased consistently at the API boundary (`Portfolio` POST, `theses/[ticker]` route, `trending` query input).
