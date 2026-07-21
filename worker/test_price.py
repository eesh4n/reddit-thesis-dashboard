from unittest.mock import MagicMock, patch
import price


def setup_function():
    # Cache is module-level and would otherwise leak between tests.
    price._price_cache.clear()


def test_get_price_returns_price_on_success():
    fake_chart = {"chart": {"result": [{"meta": {"regularMarketPrice": 123.45}}]}}
    mock_response = MagicMock(ok=True)
    mock_response.json.return_value = fake_chart

    with patch("price.requests.get", return_value=mock_response):
        result = price.get_price("NVDA")

    assert result == 123.45


def test_get_price_returns_none_on_bad_response():
    mock_response = MagicMock(ok=False)

    with patch("price.requests.get", return_value=mock_response):
        result = price.get_price("FAKETICKER")

    assert result is None


def test_get_price_returns_none_on_missing_price_field():
    fake_chart = {"chart": {"result": [{"meta": {}}]}}
    mock_response = MagicMock(ok=True)
    mock_response.json.return_value = fake_chart

    with patch("price.requests.get", return_value=mock_response):
        result = price.get_price("DELISTED")

    assert result is None


def test_get_price_returns_none_on_network_error():
    with patch("price.requests.get", side_effect=Exception("timeout")):
        result = price.get_price("NVDA")

    assert result is None


def test_get_price_caches_per_ticker():
    fake_chart = {"chart": {"result": [{"meta": {"regularMarketPrice": 200.0}}]}}
    mock_response = MagicMock(ok=True)
    mock_response.json.return_value = fake_chart

    with patch("price.requests.get", return_value=mock_response) as mock_get:
        price.get_price("AAPL")
        price.get_price("AAPL")
        price.get_price("AAPL")

    # Same ticker requested three times in one run — only one real HTTP call.
    mock_get.assert_called_once()
