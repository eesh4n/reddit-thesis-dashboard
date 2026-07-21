# Turn raw Reddit posts into structured stock theses via Gemini.
# Optimized to minimize API requests (the free tier caps at 20 requests/minute):
#   1. pre-filter posts with no ticker-like text before spending a request
#   2. batch several posts into a single request
#   3. throttle between requests to stay under the limit
import json
import re
import time
import db
import price

MODEL = "gemini-2.5-flash-lite"  # higher free-tier limits than full flash; ample for extraction
# The free tier caps REQUESTS (per-minute and per-day), not tokens — a request
# with 25 posts costs the same 1-request quota as a request with 1 post.
# gemini-2.5-flash-lite's context window is ~1M tokens, so a 25-post batch
# (well under 100K chars) is nowhere near the ceiling. Packing more posts per
# request is the single biggest lever for maximizing theses extracted per day
# against a fixed request budget — this was raised from 10 to 25 for exactly
# that reason (roughly 2.5x more posts processed per day for the same quota).
BATCH_SIZE = 25
MAX_CHARS = 4000        # cap per-post text — raised from 2000 so multi-ticker due-diligence
                        # posts (sector roundups, "X vs Y" comparisons) don't get truncated
                        # before mentioning their later tickers. Still nowhere near the
                        # model's ~1M token context even at 25 posts/batch.
THROTTLE_SECONDS = 4    # 25 posts/request * 15 req/min ≈ 375 posts/min, still under the 20/min request cap
RATE_LIMIT_WAIT = 30    # seconds to wait out a 429 before retrying the same batch
MAX_RETRIES = 6         # give up on a batch only after this many rate-limited attempts
MIN_CONFIDENCE = 0.6    # drop trade recaps / unsupported opinions the prompt scores low

# A post is worth sending only if it plausibly names a ticker: a $CASHTAG or a
# short all-caps token. This is a cheap filter — false positives just cost a slot.
TICKER_RE = re.compile(r"\$[A-Za-z]{1,5}\b|\b[A-Z]{2,5}\b")


def looks_relevant(text: str) -> bool:
    if not text:
        return False
    head = text.strip().lower()[:20]
    if "[removed]" in head or "[deleted]" in head:
        return False
    return bool(TICKER_RE.search(text))


def _strip_fences(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.strip("`").removeprefix("json").strip()
    return raw


def _valid(t: dict) -> bool:
    try:
        return (
            isinstance(t.get("ticker"), str) and t["ticker"]
            and isinstance(t.get("summary"), str) and t["summary"]
            and t.get("sentiment") in ("bullish", "bearish", "neutral")
            and 0.0 <= float(t.get("confidence", -1)) <= 1.0
        )
    except (TypeError, ValueError):
        return False


BATCH_PROMPT = """You are analyzing Reddit posts for stock investment theses.
You will receive a JSON array of posts, each with an "index" and "text".

For EACH post, extract every distinct stock ticker that has a real investment thesis.

IMPORTANT — do not stop at the first or most obvious ticker. Many posts cover MULTIPLE
tickers: sector roundups ("3 semiconductor plays for Q3"), head-to-head comparisons
("NVDA vs AMD vs AVGO"), watchlists, or a DD post that argues for a basket of names.
If the post gives separate, distinct reasoning for two or more tickers, return a
SEPARATE thesis object for EACH one — don't collapse them into a single thesis or
report only the ticker mentioned first.

A thesis is a FORWARD-LOOKING ARGUMENT: a claim about where a stock is going, backed by
reasoning a reader could evaluate — fundamentals, catalysts, valuation, data, or a clearly
described repeatable strategy. It must offer something a reader could act on or research.

Do NOT extract (return no thesis for these):
- Trade diaries and P&L updates: "my spread is up $160", "sold my calls for a gain",
  position screenshots, premium collected, gains/losses on an existing trade
- Descriptions of what a trade WAS, with no view on where the stock goes NEXT
- Questions with no view ("should I buy NVDA?"), portfolio-advice requests
- Pure price commentary with no reasoning ("AAPL ripped today")
- Memes, jokes, loss porn, celebration posts

Test: would a stranger reading only your "reasoning" learn WHY the stock might move,
not just WHAT the poster did? If not, skip it.

Return ONLY a JSON array (no other text), one element per input post, each with:
- "index": the post's index (integer, echo it back)
- "theses": an array of thesis objects, each with exactly these keys:
    - "ticker": the ticker symbol, uppercase, no "$" prefix
    - "summary": a short one-line headline (e.g. "Bearish on AAPL via puts")
    - "reasoning": 2-4 sentences on WHY the poster holds this view — their argument, evidence, catalysts, price targets, or data. If none given, say so briefly.
    - "sentiment": one of "bullish", "bearish", "neutral"
    - "confidence": float 0.0-1.0 that this is a genuine, actionable thesis (apply the test above strictly; trade recaps and unsupported opinions score below 0.5)
  If a post has no real ticker thesis, use an empty array for "theses".

Posts:
{posts_json}
"""


def extract_batch(posts: list[dict], llm_client) -> dict[int, list[dict]]:
    """posts: [{'index': int, 'text': str}]. Returns {index: [thesis, ...]}."""
    payload = json.dumps(posts, ensure_ascii=False)
    response = llm_client.models.generate_content(
        model=MODEL,
        contents=BATCH_PROMPT.format(posts_json=payload),
    )
    parsed = json.loads(_strip_fences(response.text))
    out: dict[int, list[dict]] = {}
    for item in parsed:
        idx = item.get("index")
        theses = [t for t in item.get("theses", []) if _valid(t) and float(t["confidence"]) >= MIN_CONFIDENCE]
        if isinstance(idx, int):
            out[idx] = theses
    return out


def run_extraction(llm_client) -> dict:
    """Returns stats for the WorkerRun record: candidates_queued, theses_extracted,
    requests_used, stopped_reason ("completed" | "rate_limited")."""
    posts = db.get_unextracted_posts()

    # Step 1: pre-filter. Posts with no ticker-like text never reach the API.
    candidates = []
    skipped = 0
    for p in posts:
        if looks_relevant(p["text"]):
            candidates.append(p)
        else:
            db.insert_failed_extraction(p["id"], "prefiltered_no_ticker")
            skipped += 1
    print(f"  Pre-filtered {skipped} posts with no ticker; {len(candidates)} to analyze.")

    # Step 2: batch through the API, throttled.
    inserted = 0
    requests_used = 0
    for start in range(0, len(candidates), BATCH_SIZE):
        batch = candidates[start:start + BATCH_SIZE]
        payload = [{"index": i, "text": b["text"][:MAX_CHARS]} for i, b in enumerate(batch)]

        results = None
        malformed = False
        for attempt in range(MAX_RETRIES):
            try:
                requests_used += 1
                results = extract_batch(payload, llm_client)
                break
            except Exception as e:
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                    # Temporary: wait out the per-minute window and retry the same batch.
                    print(f"  Rate limited — waiting {RATE_LIMIT_WAIT}s (attempt {attempt + 1}/{MAX_RETRIES})...")
                    time.sleep(RATE_LIMIT_WAIT)
                    continue
                # Malformed batch: record failures so we don't loop forever, then move on.
                for b in batch:
                    db.insert_failed_extraction(b["id"], str(e)[:200])
                malformed = True
                break

        if malformed:
            continue  # this batch is logged as failed; move to the next one
        if results is None:
            print("  Still rate limited after retries — stopping; remaining posts retry next run.")
            return {
                "candidates_queued": len(candidates),
                "theses_extracted": inserted,
                "requests_used": requests_used,
                "stopped_reason": "rate_limited",
            }

        for i, b in enumerate(batch):
            theses = results.get(i, [])
            for t in theses:
                try:
                    # _valid() already checked these keys exist, but defensive
                    # .get() here means a single malformed thesis object can
                    # never take down the whole run again — it did once, when
                    # ticker was accessed directly and one response omitted it.
                    ticker = t.get("ticker", "")
                    db.insert_thesis(
                        b["id"], ticker, t.get("summary", ""), t.get("reasoning", ""),
                        t.get("sentiment", "neutral"), float(t.get("confidence", 0.0)),
                        price.get_price(ticker),
                    )
                    inserted += 1
                except Exception as e:
                    print(f"  Skipping malformed thesis for post {b['id']}: {e}")
            if not theses:
                db.insert_failed_extraction(b["id"], "no_tickers_found")

        print(f"  Processed {min(start + BATCH_SIZE, len(candidates))}/{len(candidates)} — {inserted} theses so far.")
        time.sleep(THROTTLE_SECONDS)

    return {
        "candidates_queued": len(candidates),
        "theses_extracted": inserted,
        "requests_used": requests_used,
        "stopped_reason": "completed",
    }
