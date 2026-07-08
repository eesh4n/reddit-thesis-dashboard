# Recover the theses deleted during the failed reprocess run.
# Re-extracts the 7 known posts, throttled to stay under the 20 req/min free tier.
import time
import psycopg2.extras
from google import genai
import config
import db
from extract import extract_theses_from_text

POST_IDS = [
    "580636ef-7ccd-41a9-b961-93aca9552f69",
    "57c5b405-b89c-403e-beca-b5645c44d987",
    "26269cf6-d33e-4e50-affd-21f5c1a501f7",
    "d1621ebf-0d15-4490-99a9-0a33c53a9467",
    "515e1ea1-b651-4f8c-89e7-14358bcafb71",
    "1a74a050-e80c-48a8-89e0-6170cb4396df",
    "3ff7d198-ff7f-4f03-aa54-655540813a57",
]

conn = db.get_connection()
cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
cur.execute('SELECT id, text FROM "RawPost" WHERE id = ANY(%s)', (POST_IDS,))
posts = cur.fetchall()
conn.close()

llm_client = genai.Client(api_key=config.GEMINI_API_KEY)
count = 0

for post in posts:
    for attempt in range(4):  # retry a few times if rate limited
        try:
            theses = extract_theses_from_text(post["text"], llm_client)
            for t in theses:
                db.insert_thesis(post["id"], t["ticker"], t["summary"], t.get("reasoning", ""), t["sentiment"], t["confidence"])
                count += 1
            print(f"  {post['id'][:8]}: {len(theses)} theses")
            break
        except Exception as e:
            if "429" in str(e) and attempt < 3:
                print(f"  {post['id'][:8]}: rate limited, waiting 45s...")
                time.sleep(45)
            else:
                print(f"  {post['id'][:8]}: failed - {str(e)[:60]}")
                break
    time.sleep(4)  # stay well under 20 requests/minute

print(f"Done. Inserted {count} theses with reasoning.")
