# Snapshot a ticker's price at the moment a thesis is extracted — the
# prerequisite for backtesting sentiment against what the stock actually did
# afterward. Mirrors app/lib/price.ts (same free Yahoo Finance endpoint, no
# API key), kept as a small standalone module since the worker is Python and
# the web app is TypeScript.
#
# Cached per worker run: a single run's batch often mentions the same
# ticker across many posts, and there's no reason to hit Yahoo once per
# thesis when once per ticker per run is enough — the price barely moves
# meaningfully within a single extraction pass.
import requests

USER_AGENT = "Mozilla/5.0"  # Yahoo rejects requests' default user agent
CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"

_price_cache: dict[str, float | None] = {}


def get_price(ticker: str) -> float | None:
    if ticker in _price_cache:
        return _price_cache[ticker]

    price = _fetch_price(ticker)
    _price_cache[ticker] = price
    return price


def _fetch_price(ticker: str) -> float | None:
    try:
        response = requests.get(
            CHART_URL.format(ticker=ticker),
            params={"range": "1d", "interval": "1d"},
            headers={"User-Agent": USER_AGENT},
            timeout=10,
        )
        if not response.ok:
            return None
        data = response.json()
        result = (data.get("chart") or {}).get("result") or []
        if not result:
            return None
        price = (result[0].get("meta") or {}).get("regularMarketPrice")
        return float(price) if isinstance(price, (int, float)) else None
    except Exception:
        # Bad ticker, network hiccup, Yahoo schema change — a missing price
        # snapshot is a minor loss, never worth blocking thesis extraction over.
        return None
