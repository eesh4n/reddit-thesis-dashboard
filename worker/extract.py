# take a raw reddit post (text) and ask claude "what stock theses are in here?" -> claude returns structured data (ticker, summary, sentiment, confidence) and we can save it. 

import json # claude returns its answer aas a json string, we need to convert to a python list
import db # database helpers from db.py

EXTRACTION_PROMPT = """You are analyzing a Reddit post for stock investment theses.

Extract every distinct stock ticker mentioned along with the thesis being made about it.

Return ONLY a JSON array (no other text). Each element must have exactly these keys:
- "ticker": the stock ticker symbol, uppercase, no "$" prefix
- "summary": a short one-line headline of the thesis (e.g. "Bearish on AAPL via puts")
- "reasoning": 2-4 sentences explaining WHY the poster holds this view. Capture their actual argument, evidence, catalysts, price targets, or data they cite. If they gave no real reasoning, say so briefly (e.g. "No supporting reasoning given.").
- "sentiment": one of "bullish", "bearish", "neutral"
- "confidence": a float from 0.0 to 1.0 representing how confident you are this is a genuine investment thesis (not noise/joke/meme)

If no stock tickers with an actual thesis are mentioned, return an empty array: []

Post text:
---
{text}
---
"""

def extract_theses_from_text(text: str, llm_client) -> list[dict]:
    response = llm_client.models.generate_content(
        model="gemini-2.5-flash",
        contents=EXTRACTION_PROMPT.format(text=text),
    )
    raw = response.text.strip()
    if raw.startswith("```"):
        raw = raw.strip("`").removeprefix("json").strip()
    parsed = json.loads(raw)
    
    for item in parsed:
        assert item["ticker"] and isinstance(item["ticker"], str) #truthy check for if claude returned anything and then checking if its a string
        assert item["sentiment"] in ("bullish", "bearish", "neutral")
        assert 0.0 <= item["confidence"] <= 1.0
    return parsed

def run_extraction(llm_client):
    posts = db.get_unextracted_posts() # gets all unprocessed posts from database
    for post in posts:
        try:
            theses = extract_theses_from_text(post["text"], llm_client) 
            for t in theses:
                db.insert_thesis(post["id"], t["ticker"], t["summary"], t.get("reasoning", ""), t["sentiment"], t["confidence"]) #if theses are found, saves each one
            if not theses:
                db.insert_failed_extraction(post["id"], "no_tickers_found") #else, logs no tickers found
        except Exception as e:
            # 429 rate-limit is temporary: stop now, leave these posts unextracted so they retry next run
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                print(f"  Rate limit hit — stopping extraction early, remaining posts will retry next run.")
                break
            db.insert_failed_extraction(post["id"], str(e)) # a real, permanent failure (bad JSON, etc) — record it so we don't retry forever