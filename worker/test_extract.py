import json
from unittest.mock import MagicMock
from extract import extract_theses_from_text


def test_extract_theses_parses_valid_response():
    # Fake Gemini client: when the code calls
    # client.models.generate_content(...), it returns an object whose
    # .text is a JSON string — exactly what real Gemini would send back.
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = MagicMock(
        text=json.dumps([
            {"ticker": "AAPL", "summary": "Undervalued on services growth.",
             "sentiment": "bullish", "confidence": 0.8}
        ])
    )

    result = extract_theses_from_text("AAPL is undervalued because of services growth", mock_client)

    assert result == [
        {"ticker": "AAPL", "summary": "Undervalued on services growth.",
         "sentiment": "bullish", "confidence": 0.8}
    ]


def test_extract_theses_strips_markdown_fences():
    # Gemini often wraps JSON in ```json ... ``` fences even when told not to.
    # Our code strips them — this test proves it.
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = MagicMock(
        text='```json\n[{"ticker": "TSLA", "summary": "Overvalued on delivery miss.", "sentiment": "bearish", "confidence": 0.7}]\n```'
    )

    result = extract_theses_from_text("TSLA thoughts", mock_client)

    assert result[0]["ticker"] == "TSLA"
    assert result[0]["sentiment"] == "bearish"


def test_extract_theses_returns_empty_list_when_no_tickers():
    # A meme post with no stock content: Gemini should return [],
    # and our function should pass that through untouched.
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = MagicMock(text="[]")

    result = extract_theses_from_text("just a meme post with no stock talk", mock_client)

    assert result == []