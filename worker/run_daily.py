# puts everything together, the claude client, the praw api, and then reddit_ingest and then extract

from google import genai
import config
import db
from reddit_ingest import fetch_new_posts
from extract import run_extraction

def main():
    subreddits = db.get_enabled_subreddits()

    total_inserted = 0

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
    run_extraction(llm_client)
    print("Extraction pass complete.")

if __name__ == "__main__":
    main() # main() only runs when you execute python run_daily.py directly, not when another file imports this module