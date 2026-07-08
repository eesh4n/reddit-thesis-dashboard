import db

conn = db.get_connection()
cur = conn.cursor()

cur.execute('SELECT count(*) FROM "Thesis"')
print(f"Total theses: {cur.fetchone()[0]}\n")

cur.execute('''
    SELECT ticker, sentiment, confidence, summary
    FROM "Thesis"
    ORDER BY "extractedAt" DESC
''')
for ticker, sentiment, confidence, summary in cur.fetchall():
    print(f"{ticker:6} {sentiment:8} {confidence:.2f}  {summary}")

conn.close()
