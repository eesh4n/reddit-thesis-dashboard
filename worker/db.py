import psycopg2 # lets python talk to postgres
import psycopg2.extras # gives access to RealDictCursor
import config # pulls in all credentials from config.py

# One connection reused for the whole process, instead of opening/closing a
# fresh connection on every single insert. A daily run does hundreds of
# inserts (ingestion + extraction) — that was hundreds of separate
# connect/auth/close round trips for no reason.
_conn = None

def get_connection():
    global _conn
    if _conn is None or _conn.closed:
        _conn = psycopg2.connect(config.DATABASE_URL)
    return _conn

def get_enabled_subreddits() -> list[str]:
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute('SELECT name FROM "SubredditSource" WHERE enabled = true')
        return [row[0] for row in cur.fetchall()]

def insert_raw_post(post: dict) -> bool:
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO "RawPost" (id, "redditId", subreddit, author, permalink, text, score, "postedAt")
            VALUES (gen_random_uuid()::text, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT ("redditId") DO NOTHING
            """,
            (post["redditId"], post["subreddit"], post["author"], post["permalink"], post["text"], post.get("score", 0), post["postedAt"]),
        )
        inserted = cur.rowcount == 1
        conn.commit()
        return inserted

def get_unextracted_posts() -> list[dict]:
    conn = get_connection()
    with conn.cursor(cursor_factory = psycopg2.extras.RealDictCursor) as cur: # returns rows as dictionaries
        cur.execute(
            """
            SELECT rp.id, rp.text FROM "RawPost" rp
            LEFT JOIN "Thesis" t ON t."rawPostId" = rp.id
            LEFT JOIN "FailedExtraction" fe ON fe."rawPostId" = rp.id
            WHERE t.id IS NULL AND fe.id IS NULL
            ORDER BY rp.score DESC
            """

            # for every raw post, it checks if there is a matching row in Thesis or FailedExtraction
            # only returns posts where the thesis and failed extraction do not exist. this means the post still needs to be processed by the LLM.
            # ORDER BY score DESC: the free-tier extraction quota never covers the full daily backlog,
            # so process the posts more people actually upvoted/noticed first instead of scrape order.
        )
        return cur.fetchall()

def insert_thesis(raw_post_id: str, ticker: str, summary: str, reasoning: str, sentiment: str, confidence: float, price_at_extraction: float | None = None):
    conn = get_connection()
    with conn.cursor() as cur:
            cur.execute(
            """
            INSERT INTO "Thesis" (id, "rawPostId", ticker, summary, reasoning, sentiment, confidence, "priceAtExtraction")
            VALUES (gen_random_uuid()::text, %s, %s, %s, %s, %s, %s, %s)
            """,
            (raw_post_id, ticker, summary, reasoning, sentiment, confidence, price_at_extraction),

            # inserts a row into thesis table. gen_random_uuid() generates the id in postgres. the %s placeholders map to the six variables shown below, psycopg2 fills them in safely.
        )
    conn.commit()

def insert_failed_extraction(raw_post_id: str, error: str):
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO "FailedExtraction" (id, "rawPostId", error)
            VALUES (gen_random_uuid()::text, %s, %s)
            """,
            (raw_post_id, error),
        )
        conn.commit()

def start_worker_run() -> str:
    """Call at the top of run_daily.py. Returns the run id to pass to finish_worker_run."""
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO "WorkerRun" (id, "startedAt")
            VALUES (gen_random_uuid()::text, now())
            RETURNING id
            """
        )
        run_id = cur.fetchone()[0]
        conn.commit()
        return run_id

def finish_worker_run(run_id: str, posts_ingested: int, candidates_queued: int, theses_extracted: int, requests_used: int, stopped_reason: str):
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE "WorkerRun"
            SET "finishedAt" = now(), "postsIngested" = %s, "candidatesQueued" = %s,
                "thesesExtracted" = %s, "requestsUsed" = %s, "stoppedReason" = %s
            WHERE id = %s
            """,
            (posts_ingested, candidates_queued, theses_extracted, requests_used, stopped_reason, run_id),
        )
        conn.commit()
