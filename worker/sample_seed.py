# Insert realistic SAMPLE theses (with reasoning) so the dashboard shows its
# intended look without needing the Gemini API. Safe to delete later.
import db

SAMPLES = [
    ("NVDA", "Bullish — RSI dip-buy strategy", "Poster backtested buying NVDA whenever the daily RSI drops below 36 with a 4% stop loss. Over a 20-year window this roughly doubled the returns of simple buy-and-hold. They argue the setup captures oversold bounces while the stop caps downside during real breakdowns.", "bullish", 0.9),
    ("MU", "Bullish — memory supercycle entry", "Entered at $977 with a $1,300 target. Cites a low forward P/E, price above key moving averages, a record quarter on revenue and gross margin, HBM capacity expansion in Japan, and a supply deal with GM. Acknowledges risk from a potential AI bubble or a DRAM pricing rollover.", "bullish", 1.0),
    ("TSLA", "Bearish — index hedge short", "Plans to short Tesla at roughly 2% weighting to hedge broad Nasdaq exposure. Reasoning is that TSLA's large index weight means it tends to move with the market, so a short position offsets drawdowns in their long book without picking a specific catalyst.", "bearish", 1.0),
    ("ORCL", "Bearish — circular AI revenue", "Argues Oracle's cloud growth is inflated by a closed loop: OpenAI pays Oracle for compute, Oracle spends on Nvidia chips, creating demand that circles back on itself. Views this as artificial demand characteristic of an unsustainable AI bubble rather than organic enterprise adoption.", "bearish", 0.9),
    ("AAPL", "Bearish — buying puts", "Poster is buying put options on Apple, expecting the stock to fall. Little fundamental detail is given beyond positioning; the trade reads as a directional bet on near-term weakness rather than a deeply argued thesis.", "bearish", 0.6),
    ("SPX", "Bearish — BofA year-end call", "Bank of America projects the S&P 500 closes the year below current levels. The argument leans on historical patterns where rapid gains concentrated in high-multiple stocks tend to precede a market correction.", "bearish", 0.8),
]

conn = db.get_connection()
cur = conn.cursor()

# Attach each sample to a real RawPost so the "source" link works.
cur.execute('SELECT id FROM "RawPost" LIMIT %s', (len(SAMPLES),))
post_ids = [r[0] for r in cur.fetchall()]

for (ticker, summary, reasoning, sentiment, confidence), pid in zip(SAMPLES, post_ids):
    cur.execute(
        '''INSERT INTO "Thesis" (id, "rawPostId", ticker, summary, reasoning, sentiment, confidence)
           VALUES (gen_random_uuid()::text, %s, %s, %s, %s, %s, %s)''',
        (pid, ticker, summary, reasoning, sentiment, confidence),
    )
conn.commit()
print(f"Inserted {len(SAMPLES)} sample theses.")
conn.close()
