"""Tests for the Portfolio feature.

Covers:
  - api/portfolio.py  : _load_portfolio(), handle_portfolio_get(), handle_portfolio_post()
  - static/index.html : nav buttons, panel divs, script tag, CSS hidden-by-default list
  - static/portfolio.js : key symbols present, USD value calculation logic
  - static/style.css  : showing-portfolio rule, hidden-by-default entry
  - static/panels.js  : MAIN_VIEW_PANELS entry, switchPanel loadPortfolio call
"""
import io
import json
import pathlib
import sys
from types import SimpleNamespace

import pytest

REPO_ROOT = pathlib.Path(__file__).parent.parent.resolve()
sys.path.insert(0, str(REPO_ROOT))

INDEX_HTML   = (REPO_ROOT / "static" / "index.html").read_text(encoding="utf-8")
PANELS_JS    = (REPO_ROOT / "static" / "panels.js").read_text(encoding="utf-8")
PORTFOLIO_JS = (REPO_ROOT / "static" / "portfolio.js").read_text(encoding="utf-8")
STYLE_CSS    = (REPO_ROOT / "static" / "style.css").read_text(encoding="utf-8")


# ── HTTP handler stub (mirrors test_insights.py pattern) ─────────────────────

class _FakeHandler:
    def __init__(self):
        self.status = None
        self.sent_headers = []
        self.body = bytearray()
        self.wfile = self

    def send_response(self, status):
        self.status = status

    def send_header(self, name, value):
        self.sent_headers.append((name, value))

    def end_headers(self):
        pass

    def write(self, data):
        self.body.extend(data)

    def json_body(self):
        return json.loads(bytes(self.body).decode("utf-8"))


# ── Backend: _load_portfolio ─────────────────────────────────────────────────

def _make_portfolio_module(monkeypatch, tmp_path):
    """Return api.portfolio with PORTFOLIO_FILE pointed at tmp_path/portfolio.json."""
    import api.portfolio as mod
    monkeypatch.setattr(mod, "PORTFOLIO_FILE", tmp_path / "portfolio.json")
    return mod


def test_load_portfolio_missing_file_returns_empty(monkeypatch, tmp_path):
    mod = _make_portfolio_module(monkeypatch, tmp_path)
    result = mod._load_portfolio()
    assert result["holdings"] == []
    assert result["last_updated"] is None


def test_load_portfolio_new_format(monkeypatch, tmp_path):
    mod = _make_portfolio_module(monkeypatch, tmp_path)
    payload = {
        "last_updated": "2026-07-20T15:30:00",
        "holdings": [
            {"symbol": "AAPL", "name": "Apple", "qty": 10, "cost": 150.0, "price": 190.0, "currency": "USD", "usd_fx": 1},
        ],
    }
    (tmp_path / "portfolio.json").write_text(json.dumps(payload), encoding="utf-8")
    result = mod._load_portfolio()
    assert result["last_updated"] == "2026-07-20T15:30:00"
    assert len(result["holdings"]) == 1
    assert result["holdings"][0]["symbol"] == "AAPL"


def test_load_portfolio_legacy_list_format(monkeypatch, tmp_path):
    """Plain list (old format) must still be accepted with last_updated=None."""
    mod = _make_portfolio_module(monkeypatch, tmp_path)
    legacy = [
        {"symbol": "MSFT", "name": "Microsoft", "qty": 5, "cost": 280.0, "price": 415.0, "currency": "USD"},
    ]
    (tmp_path / "portfolio.json").write_text(json.dumps(legacy), encoding="utf-8")
    result = mod._load_portfolio()
    assert result["last_updated"] is None
    assert len(result["holdings"]) == 1
    assert result["holdings"][0]["symbol"] == "MSFT"


def test_load_portfolio_drops_malformed_rows(monkeypatch, tmp_path):
    """Rows missing required fields are silently dropped."""
    mod = _make_portfolio_module(monkeypatch, tmp_path)
    payload = {
        "holdings": [
            {"symbol": "OK",  "qty": 1,  "cost": 10.0, "price": 20.0},   # valid
            {"symbol": "BAD", "qty": 1,  "cost": 10.0},                   # missing price
            {"qty": 1, "cost": 10.0, "price": 20.0},                      # missing symbol
        ]
    }
    (tmp_path / "portfolio.json").write_text(json.dumps(payload), encoding="utf-8")
    result = mod._load_portfolio()
    assert len(result["holdings"]) == 1
    assert result["holdings"][0]["symbol"] == "OK"


def test_load_portfolio_corrupted_json_returns_empty(monkeypatch, tmp_path):
    mod = _make_portfolio_module(monkeypatch, tmp_path)
    (tmp_path / "portfolio.json").write_text("{not valid json{{", encoding="utf-8")
    result = mod._load_portfolio()
    assert result["holdings"] == []
    assert result["last_updated"] is None


# ── Backend: GET /api/portfolio ───────────────────────────────────────────────

def test_get_portfolio_returns_200_with_holdings_and_last_updated(monkeypatch, tmp_path):
    mod = _make_portfolio_module(monkeypatch, tmp_path)
    payload = {
        "last_updated": "2026-07-20T12:00:00",
        "holdings": [
            {"symbol": "NVDA", "name": "NVIDIA", "qty": 10, "cost": 450.0, "price": 875.0, "currency": "USD", "usd_fx": 1},
        ],
    }
    (tmp_path / "portfolio.json").write_text(json.dumps(payload), encoding="utf-8")

    handler = _FakeHandler()
    mod.handle_portfolio_get(handler, SimpleNamespace(query=""))
    assert handler.status == 200
    body = handler.json_body()
    assert "holdings" in body
    assert "last_updated" in body
    assert body["last_updated"] == "2026-07-20T12:00:00"
    assert len(body["holdings"]) == 1
    assert body["holdings"][0]["symbol"] == "NVDA"


def test_get_portfolio_empty_when_no_file(monkeypatch, tmp_path):
    mod = _make_portfolio_module(monkeypatch, tmp_path)
    handler = _FakeHandler()
    mod.handle_portfolio_get(handler, SimpleNamespace(query=""))
    assert handler.status == 200
    body = handler.json_body()
    assert body["holdings"] == []
    assert body["last_updated"] is None


# ── Backend: POST /api/portfolio ──────────────────────────────────────────────

def test_post_portfolio_writes_file_and_returns_count(monkeypatch, tmp_path):
    mod = _make_portfolio_module(monkeypatch, tmp_path)
    holdings = [
        {"symbol": "AAPL", "qty": 50, "cost": 165.0, "price": 189.0, "currency": "USD", "usd_fx": 1},
        {"symbol": "TSM",  "qty": 60, "cost": 100.0, "price": 165.0, "currency": "USD", "usd_fx": 1},
    ]
    handler = _FakeHandler()
    mod.handle_portfolio_post(handler, {"holdings": holdings, "last_updated": "2026-07-20T10:00:00"})
    assert handler.status == 200
    body = handler.json_body()
    assert body["ok"] is True
    assert body["count"] == 2

    saved = json.loads((tmp_path / "portfolio.json").read_text(encoding="utf-8"))
    assert saved["last_updated"] == "2026-07-20T10:00:00"
    assert len(saved["holdings"]) == 2


def test_post_portfolio_rejects_non_list(monkeypatch, tmp_path):
    mod = _make_portfolio_module(monkeypatch, tmp_path)
    handler = _FakeHandler()
    mod.handle_portfolio_post(handler, {"holdings": {"symbol": "AAPL"}})
    assert handler.status == 400


def test_post_portfolio_rejects_rows_missing_required_fields(monkeypatch, tmp_path):
    mod = _make_portfolio_module(monkeypatch, tmp_path)
    handler = _FakeHandler()
    bad_rows = [{"symbol": "AAPL", "qty": 10}]   # missing cost + price
    mod.handle_portfolio_post(handler, {"holdings": bad_rows})
    assert handler.status == 400
    body = handler.json_body()
    assert "error" in body


# ── Frontend: index.html ──────────────────────────────────────────────────────

def test_html_has_portfolio_rail_button():
    assert 'data-panel="portfolio"' in INDEX_HTML
    assert 'onclick="switchPanel(\'portfolio\'' in INDEX_HTML


def test_html_has_portfolio_rail_and_mobile_buttons():
    """Both the desktop rail and the mobile sidebar-nav must have the button."""
    rail_idx   = INDEX_HTML.find('<nav class="rail"')
    mobile_idx = INDEX_HTML.find('<div class="sidebar-nav">')
    assert rail_idx != -1 and mobile_idx != -1
    rail_section   = INDEX_HTML[rail_idx:mobile_idx]
    mobile_section = INDEX_HTML[mobile_idx:]
    assert 'data-panel="portfolio"' in rail_section,   "rail nav missing portfolio button"
    assert 'data-panel="portfolio"' in mobile_section, "mobile nav missing portfolio button"


def test_html_has_panel_portfolio_div():
    assert 'id="panelPortfolio"' in INDEX_HTML


def test_html_has_main_portfolio_div():
    assert 'id="mainPortfolio"' in INDEX_HTML


def test_html_has_portfolio_container_div():
    assert 'id="portfolioContainer"' in INDEX_HTML


def test_html_has_portfolio_updated_main_span():
    assert 'id="portfolioUpdatedMain"' in INDEX_HTML


def test_html_loads_portfolio_js():
    assert 'portfolio.js' in INDEX_HTML


def test_html_portfolio_button_is_after_logs_button():
    logs_idx  = INDEX_HTML.find('data-panel="logs"')
    pf_idx    = INDEX_HTML.find('data-panel="portfolio"')
    assert logs_idx != -1 and pf_idx != -1
    assert pf_idx > logs_idx, "portfolio button must appear after logs button"


# ── Frontend: panels.js ───────────────────────────────────────────────────────

def test_panels_js_has_portfolio_in_main_view_panels():
    assert "'portfolio'" in PANELS_JS or '"portfolio"' in PANELS_JS
    assert "MAIN_VIEW_PANELS" in PANELS_JS
    # Find the array and confirm portfolio is inside it
    start = PANELS_JS.find("MAIN_VIEW_PANELS")
    end   = PANELS_JS.find("]", start)
    array_src = PANELS_JS[start:end]
    assert "portfolio" in array_src


def test_panels_js_calls_load_portfolio_on_switch():
    assert "loadPortfolio" in PANELS_JS
    # The call must be inside the switchPanel body, guarded by nextPanel check
    switch_start = PANELS_JS.find("async function switchPanel")
    switch_end   = PANELS_JS.find("\nasync function ", switch_start + 1)
    switch_body  = PANELS_JS[switch_start:switch_end] if switch_end != -1 else PANELS_JS[switch_start:]
    assert "loadPortfolio" in switch_body


def test_panels_js_has_portfolio_i18n_key():
    assert "tab_portfolio" in PANELS_JS


# ── Frontend: portfolio.js ────────────────────────────────────────────────────

def test_portfolio_js_has_load_function():
    assert "async function loadPortfolio" in PORTFOLIO_JS


def test_portfolio_js_calls_api_portfolio_endpoint():
    assert "/api/portfolio" in PORTFOLIO_JS


def test_portfolio_js_reads_last_updated():
    assert "last_updated" in PORTFOLIO_JS


def test_portfolio_js_sets_updated_label():
    assert "_setUpdatedLabel" in PORTFOLIO_JS
    assert "portfolioUpdatedMain" in PORTFOLIO_JS


def test_portfolio_js_computes_usd_value():
    assert "usdValue" in PORTFOLIO_JS
    assert "usd_fx" in PORTFOLIO_JS
    assert "totalUsdValue" in PORTFOLIO_JS


def test_portfolio_js_usd_value_formula():
    """usdValue = marketValue / fx — verify the division is present."""
    assert "marketValue / fx" in PORTFOLIO_JS or "/ fx" in PORTFOLIO_JS


def test_portfolio_js_renders_dollar_sign_in_summary():
    assert 'totalUsdValue' in PORTFOLIO_JS
    # The summary row must include a $ prefix
    assert '$`' in PORTFOLIO_JS or '"$"' in PORTFOLIO_JS or '`$' in PORTFOLIO_JS


def test_portfolio_js_renders_usd_value_column():
    assert "USD Value" in PORTFOLIO_JS or "usdValue" in PORTFOLIO_JS


def test_portfolio_js_weight_uses_usd_value():
    """Weight must be computed from usdValue / totalUsdValue (not local marketValue)."""
    assert "usdValue / totalUsdValue" in PORTFOLIO_JS or \
           "r.usdValue / totalUsdValue" in PORTFOLIO_JS


def test_portfolio_js_fx_defaults_to_one_when_missing():
    """usd_fx must have a safe fallback (> 0 guard) to avoid division by zero."""
    assert "usd_fx > 0" in PORTFOLIO_JS or "usd_fx || 1" in PORTFOLIO_JS


# ── Frontend: style.css ───────────────────────────────────────────────────────

def test_css_main_portfolio_in_hidden_by_default_list():
    """#mainPortfolio must be in the display:none block alongside #mainLogs etc."""
    # Find the line(s) that contain display:none for main-view panels
    hidden_block_start = STYLE_CSS.find("main.main > #mainChat")
    hidden_block_end   = STYLE_CSS.find("display:none", hidden_block_start)
    hidden_block = STYLE_CSS[hidden_block_start : hidden_block_end + len("display:none")]
    assert "#mainPortfolio" in hidden_block, (
        "#mainPortfolio missing from the display:none hidden-by-default list in style.css"
    )


def test_css_showing_portfolio_reveals_main_portfolio():
    assert "showing-portfolio" in STYLE_CSS
    assert "#mainPortfolio" in STYLE_CSS
    # The showing-portfolio rule must set display:flex (or display:block) on #mainPortfolio
    pf_rule_idx = STYLE_CSS.find("showing-portfolio")
    pf_rule = STYLE_CSS[pf_rule_idx: pf_rule_idx + 120]
    assert "display:" in pf_rule


def test_css_main_chat_not_shown_when_portfolio_active():
    """#mainChat visibility rule must exclude showing-portfolio."""
    chat_vis_idx = STYLE_CSS.find("#mainChat{display:flex}")
    assert chat_vis_idx != -1, "#mainChat display:flex rule not found"
    # Walk backwards to find the :not() guard chain
    rule_start = STYLE_CSS.rfind("main.main", 0, chat_vis_idx)
    rule = STYLE_CSS[rule_start: chat_vis_idx + len("#mainChat{display:flex}")]
    assert "showing-portfolio" in rule, (
        ":not(.showing-portfolio) missing from #mainChat visibility guard"
    )


def test_css_has_portfolio_table_styles():
    assert ".pf-table" in STYLE_CSS
    assert ".pf-summary" in STYLE_CSS
    assert ".pf-pos" in STYLE_CSS
    assert ".pf-neg" in STYLE_CSS


def test_css_has_pf_updated_label():
    assert ".pf-updated-label" in STYLE_CSS
