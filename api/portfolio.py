"""Portfolio API handler.

Data file: STATE_DIR/portfolio.json
Format:
{
  "last_updated": "2026-07-20T15:30:00",   # ISO 8601 local time, no timezone suffix
  "holdings": [ { symbol, name, qty, cost, price, currency }, ... ]
}

Legacy format (plain list) is also accepted for backward compatibility.
If the file does not exist the endpoint returns an empty holdings list.
"""
import json
from pathlib import Path

from api.config import STATE_DIR
from api.helpers import bad, j

PORTFOLIO_FILE = STATE_DIR / "portfolio.json"

_REQUIRED_FIELDS = {"symbol", "qty", "cost", "price"}


def _load_portfolio() -> dict:
    """Return {"holdings": [...], "last_updated": str|None}."""
    if not PORTFOLIO_FILE.exists():
        return {"holdings": [], "last_updated": None}
    try:
        data = json.loads(PORTFOLIO_FILE.read_text(encoding="utf-8"))
        # Legacy format: plain list
        if isinstance(data, list):
            holdings = data
            last_updated = None
        elif isinstance(data, dict):
            holdings = data.get("holdings", [])
            last_updated = data.get("last_updated")
        else:
            return {"holdings": [], "last_updated": None}
        # Basic field validation – drop malformed rows silently
        holdings = [h for h in holdings if isinstance(h, dict) and _REQUIRED_FIELDS.issubset(h)]
        return {"holdings": holdings, "last_updated": last_updated}
    except Exception:
        return {"holdings": [], "last_updated": None}


def handle_portfolio_get(handler, parsed) -> bool:
    portfolio = _load_portfolio()
    j(handler, {
        "holdings": portfolio["holdings"],
        "last_updated": portfolio["last_updated"],
        "file": str(PORTFOLIO_FILE),
    })
    return True


def handle_portfolio_post(handler, body) -> bool:
    """Replace portfolio holdings with the POSTed list."""
    holdings = body.get("holdings")
    if not isinstance(holdings, list):
        return bad(handler, "holdings must be a list", status=400)
    invalid = [i for i, h in enumerate(holdings)
               if not isinstance(h, dict) or not _REQUIRED_FIELDS.issubset(h)]
    if invalid:
        return bad(handler, f"rows {invalid} are missing required fields {sorted(_REQUIRED_FIELDS)}", status=400)
    last_updated = body.get("last_updated")
    payload = {"last_updated": last_updated, "holdings": holdings}
    PORTFOLIO_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    j(handler, {"ok": True, "count": len(holdings)})
    return True
