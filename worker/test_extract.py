import json
from unittest.mock import MagicMock
from extract import looks_relevant, extract_batch


def test_looks_relevant_skips_removed_and_tickerless():
    # Removed/empty/no-ticker posts should never reach the API.
    assert looks_relevant("[removed]") is False
    assert looks_relevant("") is False
    assert looks_relevant("just chatting about my day") is False
    # A cashtag or an all-caps ticker makes a post worth analyzing.
    assert looks_relevant("I think $NVDA is a buy") is True
    assert looks_relevant("AAPL earnings look strong") is True


def test_extract_batch_maps_theses_by_index():
    # Fake Gemini returns one result element per input post, echoing the index.
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = MagicMock(text=json.dumps([
        {"index": 0, "theses": [
            {"ticker": "NVDA", "summary": "Bullish on NVDA", "reasoning": "Strong demand.", "sentiment": "bullish", "confidence": 0.8}
        ]},
        {"index": 1, "theses": []},
    ]))

    result = extract_batch(
        [{"index": 0, "text": "NVDA to the moon"}, {"index": 1, "text": "no tickers here"}],
        mock_client,
    )

    assert result[0][0]["ticker"] == "NVDA"
    assert result[1] == []


def test_extract_batch_drops_invalid_theses():
    # An invalid sentiment should be filtered out, not stored.
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = MagicMock(text=json.dumps([
        {"index": 0, "theses": [
            {"ticker": "TSLA", "summary": "x", "reasoning": "y", "sentiment": "MOON", "confidence": 0.9}
        ]},
    ]))

    result = extract_batch([{"index": 0, "text": "TSLA"}], mock_client)

    assert result[0] == []


def test_extract_batch_drops_low_confidence_trade_recaps():
    # The prompt scores trade diaries / P&L updates below 0.5 — the floor drops them.
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = MagicMock(text=json.dumps([
        {"index": 0, "theses": [
            {"ticker": "ORCL", "summary": "Put credit spread showing gains", "reasoning": "No forward view given.", "sentiment": "bullish", "confidence": 0.3}
        ]},
    ]))

    result = extract_batch([{"index": 0, "text": "my ORCL spread is up $160"}], mock_client)

    assert result[0] == []


def test_extract_batch_drops_thesis_missing_summary():
    # Regression test: a real Gemini response once omitted "summary" from a
    # thesis object. _valid() didn't check for it, so it passed through and
    # crashed insert_thesis() with a KeyError mid-run, killing the whole
    # extraction pass. summary must be required just like ticker/sentiment.
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = MagicMock(text=json.dumps([
        {"index": 0, "theses": [
            {"ticker": "NVDA", "reasoning": "y", "sentiment": "bullish", "confidence": 0.9}
        ]},
    ]))

    result = extract_batch([{"index": 0, "text": "NVDA thoughts"}], mock_client)

    assert result[0] == []
