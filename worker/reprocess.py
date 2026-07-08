# One-off: re-extract theses for posts that already produced theses, so they
# pick up the new "reasoning" field. Only touches those posts (not the backlog).
import psycopg2.extras
from google import genai
import config
import db
from extract import extract_theses_from_text

conn = db.get_connection()
cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

# Distinct posts that currently have at least one thesis.
cur.execute('''
    SELECT DISTINCT rp.id, rp.text
    FROM "RawPost" rp
    JOIN "Thesis" t ON t."rawPostId" = rp.id
''')
posts = cur.fetchall()
print(f"Reprocessing {len(posts)} posts...")

# Clear their old theses so we can re-insert with reasoning.
cur.execute('DELETE FROM "Thesis"')
conn.commit()

llm_client = genai.Client(api_key=config.GEMINI_API_KEY)
count = 0
for post in posts:
    try:
        theses = extract_theses_from_text(post["text"], llm_client)
        for t in theses:
            db.insert_thesis(post["id"], t["ticker"], t["summary"], t.get("reasoning", ""), t["sentiment"], t["confidence"])
            count += 1
    except Exception as e:
        print(f"  Failed on {post['id']}: {str(e)[:80]}")

print(f"Done. Inserted {count} theses with reasoning.")
conn.close()
