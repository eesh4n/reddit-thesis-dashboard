# puts everything together, the claude client, the praw api, and then reddit_ingest and then extract

from google import genai
import config
import db
from reddit_ingest import fetch_new_posts
from extract import run_extraction

def main():
    run_id = db.start_worker_run()  # tracked so the quota dashboard has real run history

    # If anything below throws unexpectedly, this run record must still be
    # finalized — otherwise it sits forever as "running" on the quota page,
    # which is exactly what happened the one time a malformed Gemini response
    # crashed extraction mid-run.
    stats = {"candidates_queued": 0, "theses_extracted": 0, "requests_used": 0, "stopped_reason": "error"}
    total_inserted = 0

    try:
        subreddits = db.get_enabled_subreddits()

        for name in subreddits:
            try:
                posts = fetch_new_posts(name, limit = 50)
            except Exception as e:
                print(f"  Skipping r/{name}: {e}")
                continue
            for post in posts:
                if db.insert_raw_post(post):
                    total_inserted += 1

        print(f"Ingested {total_inserted} new posts across {len(subreddits)} subreddits.")

        llm_client = genai.Client(api_key = config.GEMINI_API_KEY)
        stats = run_extraction(llm_client)
        print("Extraction pass complete.")
    finally:
        db.finish_worker_run(
            run_id,
            posts_ingested=total_inserted,
            candidates_queued=stats["candidates_queued"],
            theses_extracted=stats["theses_extracted"],
            requests_used=stats["requests_used"],
            stopped_reason=stats["stopped_reason"],
        )

if __name__ == "__main__":
    main() # main() only runs when you execute python run_daily.py directly, not when another file imports this module
