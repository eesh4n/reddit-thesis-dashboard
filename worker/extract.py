# Turn raw Reddit posts into structured stock theses via Gemini.
# Optimized to minimize API requests (the free tier caps at 20 requests/minute):
#   1. pre-filter posts with no ticker-like text before spending a request
#   2. batch several posts into a single request
#   3. throttle between requests to stay under the limit
import json
import re
import time
import db

MODEL = "gemini-2.5-flash-lite"  # higher free-tier limits than full flash; ample for extraction
BATCH_SIZE = 10         # posts per Gemini request (fewer requests = fewer rate limits)
MAX_CHARS = 2000        # cap per-post text so batches stay small
THROTTLE_SECONDS = 5    # ~12 requests/minute, safely under the 20/min free-tier cap
RATE_LIMIT_WAIT = 30    # seconds to wait out a 429 before retrying the same batch
MAX_RETRIES = 6         # give up on a batch only after this many rate-limited attempts

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
            and t.get("sentiment") in ("bullish", "bearish", "neutral")
            and 0.0 <= float(t.get("confidence", -1)) <= 1.0
        )
    except (TypeError, ValueError):
        return False


BATCH_PROMPT = """You are analyzing Reddit posts for stock investment theses.
You will receive a JSON array of posts, each with an "index" and "text".

For EACH post, extract every distinct stock ticker that has a real investment thesis.

Return ONLY a JSON array (no other text), one element per input post, each with:
- "index": the post's index (integer, echo it back)
- "theses": an array of thesis objects, each with exactly these keys:
    - "ticker": the ticker symbol, uppercase, no "$" prefix
    - "summary": a short one-line headline (e.g. "Bearish on AAPL via puts")
    - "reasoning": 2-4 sentences on WHY the poster holds this view — their argument, evidence, catalysts, price targets, or data. If none given, say so briefly.
    - "sentiment": one of "bullish", "bearish", "neutral"
    - "confidence": float 0.0-1.0 that this is a genuine thesis (not noise/joke/meme)
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
        theses = [t for t in item.get("theses", []) if _valid(t)]
        if isinstance(idx, int):
            out[idx] = theses
    return out


def run_extraction(llm_client):
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
    for start in range(0, len(candidates), BATCH_SIZE):
        batch = candidates[start:start + BATCH_SIZE]
        payload = [{"index": i, "text": b["text"][:MAX_CHARS]} for i, b in enumerate(batch)]

        results = None
        malformed = False
        for attempt in range(MAX_RETRIES):
            try:
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
            return

        for i, b in enumerate(batch):
            theses = results.get(i, [])
            for t in theses:
                db.insert_thesis(b["id"], t["ticker"], t["summary"], t.get("reasoning", ""), t["sentiment"], float(t["confidence"]))
                inserted += 1
            if not theses:
                db.insert_failed_extraction(b["id"], "no_tickers_found")

        print(f"  Processed {min(start + BATCH_SIZE, len(candidates))}/{len(candidates)} — {inserted} theses so far.")
        time.sleep(THROTTLE_SECONDS)
