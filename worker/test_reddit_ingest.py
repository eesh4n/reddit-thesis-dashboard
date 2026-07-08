from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from reddit_ingest import fetch_new_posts


def test_fetch_new_posts_maps_json_fields():
    # A hand-built dict shaped exactly like Reddit's real .json response.
    # This is our "fake Reddit" — the test never touches the internet.
    fake_listing = {
        "data": [
            {
                "name": "t3_abc123",
                "title": "AAPL is undervalued",
                "selftext": "Here's my thesis...",
                "author": "trader_joe",
                "permalink": "/r/stocks/comments/abc123/aapl_is_undervalued/",
                "created_utc": 1700000000.0,
            }
        ]
    }

    # Fake response object: when the code calls response.json(),
    # it will get our fake_listing back.
    mock_response = MagicMock()
    mock_response.json.return_value = fake_listing

    # Replace requests.get inside reddit_ingest with a fake for the
    # duration of this block. We patch "reddit_ingest.requests.get"
    # (where it's USED), not "requests.get" globally — that's the rule
    # for patching: patch it where it's looked up.
    with patch("reddit_ingest.requests.get", return_value=mock_response) as mock_get:
        result = fetch_new_posts("stocks", limit=10)

    # Verify our function made exactly one HTTP call, to the right URL.
    mock_get.assert_called_once()
    assert "arctic-shift" in mock_get.call_args.args[0]
    
    # Verify every field got mapped from Reddit's format to our format.
    assert len(result) == 1
    post = result[0]
    assert post["redditId"] == "t3_abc123"
    assert post["subreddit"] == "stocks"
    assert post["author"] == "trader_joe"
    assert post["permalink"] == "https://reddit.com/r/stocks/comments/abc123/aapl_is_undervalued/"
    # title and body should be combined into one text field
    assert "AAPL is undervalued" in post["text"]
    assert "Here's my thesis..." in post["text"]
    # Unix timestamp should become a proper timezone-aware datetime
    assert post["postedAt"] == datetime.fromtimestamp(1700000000.0, tz=timezone.utc)