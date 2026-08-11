from __future__ import annotations

import os
import time
from pathlib import Path
from types import SimpleNamespace

import pytest


ROOT = Path(__file__).resolve().parents[1]


class _FakeHandler:
    def __init__(self, headers=None):
        self.status = None
        self.sent_headers: list[tuple[str, str]] = []
        self.body = bytearray()
        self.wfile = self
        self.headers = dict(headers or {})

    def send_response(self, code):
        self.status = code

    def send_header(self, key, value):
        self.sent_headers.append((key, value))

    def end_headers(self):
        pass

    def write(self, data):
        self.body.extend(data)

    def header(self, key):
        return next((v for k, v in self.sent_headers if k == key), "") or ""


def _serve(routes, target, mime, cache_control, headers=None, **kwargs):
    handler = _FakeHandler(headers)
    result = routes._serve_file_bytes(
        handler, target, mime, "inline", cache_control, **kwargs
    )
    return handler, result


@pytest.fixture
def routes():
    from api import routes
    return routes


# ── _serve_file_bytes ETag / 304 ──────────────────────────────────────────


def test_serve_file_bytes_emits_weak_etag(routes, tmp_path):
    target = tmp_path / "img.png"
    target.write_bytes(b"\x89PNG\r\n\x1a\npayload")
    handler, _ = _serve(routes, target, "image/png", "no-cache")

    assert handler.status == 200
    assert handler.body == b"\x89PNG\r\n\x1a\npayload"
    etag = handler.header("ETag")
    assert etag and etag.startswith('W/"')
    assert etag.endswith('"')


def test_if_none_match_matching_returns_304_no_body(routes, tmp_path):
    target = tmp_path / "img.png"
    target.write_bytes(b"abc")
    handler, _ = _serve(routes, target, "image/png", "no-cache")
    etag = handler.header("ETag")
    assert handler.status == 200

    handler2, _ = _serve(
        routes, target, "image/png", "no-cache", headers={"If-None-Match": etag}
    )
    assert handler2.status == 304
    assert handler2.body == b""
    assert handler2.header("ETag") == etag
    assert handler2.header("Cache-Control") == "no-cache"


def test_if_none_match_star_returns_304(routes, tmp_path):
    target = tmp_path / "img.png"
    target.write_bytes(b"abc")
    handler, _ = _serve(
        routes, target, "image/png", "no-cache", headers={"If-None-Match": "*"}
    )
    assert handler.status == 304


def test_if_none_match_mismatch_returns_full_200(routes, tmp_path):
    target = tmp_path / "img.png"
    target.write_bytes(b"abc")
    handler, _ = _serve(
        routes,
        target,
        "image/png",
        "no-cache",
        headers={"If-None-Match": 'W/"1-1"'},
    )
    assert handler.status == 200
    assert handler.body == b"abc"


def test_if_none_match_weak_comparison_ignores_w_prefix(routes, tmp_path):
    """RFC 7232 weak comparison: client may send the strong form (no W/)."""
    target = tmp_path / "img.png"
    target.write_bytes(b"abc")
    handler, _ = _serve(routes, target, "image/png", "no-cache")
    strong_form = handler.header("ETag")[2:]  # strip W/ -> '"<mtime>-<size>"'
    handler2, _ = _serve(
        routes, target, "image/png", "no-cache", headers={"If-None-Match": strong_form}
    )
    assert handler2.status == 304


def test_if_none_match_list_any_entry_matches(routes, tmp_path):
    target = tmp_path / "img.png"
    target.write_bytes(b"abc")
    handler, _ = _serve(routes, target, "image/png", "no-cache")
    etag = handler.header("ETag")
    handler2, _ = _serve(
        routes,
        target,
        "image/png",
        "no-cache",
        headers={"If-None-Match": f'W/"0-0", {etag}, W/"2-2"'},
    )
    assert handler2.status == 304


def test_etag_changes_when_file_replaced_in_place(routes, tmp_path):
    """Core user scenario: same-name file updated -> old ETag no longer valid."""
    target = tmp_path / "img.png"
    target.write_bytes(b"v1")
    handler, _ = _serve(routes, target, "image/png", "no-cache")
    old_etag = handler.header("ETag")

    time.sleep(0.01)  # ensure mtime_ns advances
    target.write_bytes(b"v2-content")
    handler2, _ = _serve(
        routes, target, "image/png", "no-cache", headers={"If-None-Match": old_etag}
    )
    assert handler2.status == 200
    assert handler2.body == b"v2-content"
    assert handler2.header("ETag") != old_etag


def test_range_response_includes_etag(routes, tmp_path):
    target = tmp_path / "img.png"
    target.write_bytes(b"0123456789")
    handler, _ = _serve(
        routes, target, "image/png", "no-cache", headers={"Range": "bytes=0-2"}
    )
    assert handler.status == 206
    assert handler.body == b"012"
    assert handler.header("ETag") and handler.header("ETag").startswith('W/"')


def test_if_none_match_precedes_range(routes, tmp_path):
    """A matched conditional request short-circuits before Range handling."""
    target = tmp_path / "img.png"
    target.write_bytes(b"0123456789")
    handler, _ = _serve(routes, target, "image/png", "no-cache")
    etag = handler.header("ETag")
    handler2, _ = _serve(
        routes,
        target,
        "image/png",
        "no-cache",
        headers={"If-None-Match": etag, "Range": "bytes=0-2"},
    )
    assert handler2.status == 304


def test_invalid_range_still_416(routes, tmp_path):
    target = tmp_path / "img.png"
    target.write_bytes(b"0123456789")
    handler, _ = _serve(
        routes, target, "image/png", "no-cache", headers={"Range": "bytes=999-1000"}
    )
    assert handler.status == 416
    assert handler.header("Content-Range") == "bytes */10"


# ── _handle_media end-to-end (real user path) ─────────────────────────────


def _media_get(routes, monkeypatch, target, headers=None):
    monkeypatch.setattr("api.auth.is_auth_enabled", lambda: False)
    handler = _FakeHandler(headers)
    parsed = SimpleNamespace(path="/api/media", query=f"path={target}")
    routes._handle_media(handler, parsed)
    return handler


def test_handle_media_image_served_with_no_cache_and_etag(routes, monkeypatch, tmp_path):
    img = tmp_path / "pic.png"
    img.write_bytes(b"\x89PNG\r\n\x1a\nimagedata")
    handler = _media_get(routes, monkeypatch, img)

    assert handler.status == 200
    assert handler.header("Cache-Control") == "no-cache"
    assert handler.header("ETag") and handler.header("ETag").startswith('W/"')
    assert bytes(handler.body) == b"\x89PNG\r\n\x1a\nimagedata"


def test_handle_media_image_revalidation_returns_304(routes, monkeypatch, tmp_path):
    img = tmp_path / "pic.png"
    img.write_bytes(b"\x89PNG\r\n\x1a\nimagedata")
    first = _media_get(routes, monkeypatch, img)
    etag = first.header("ETag")

    second = _media_get(
        routes, monkeypatch, img, headers={"If-None-Match": etag}
    )
    assert second.status == 304
    assert second.body == b""


def test_handle_media_image_update_in_place_revalidates(routes, monkeypatch, tmp_path):
    """The bug this fix targets: same-name image replaced -> preview must refresh."""
    img = tmp_path / "pic.png"
    img.write_bytes(b"old-content")
    first = _media_get(routes, monkeypatch, img)
    old_etag = first.header("ETag")

    time.sleep(0.01)
    img.write_bytes(b"new-content-here")
    second = _media_get(
        routes, monkeypatch, img, headers={"If-None-Match": old_etag}
    )
    assert second.status == 200
    assert bytes(second.body) == b"new-content-here"
    assert second.header("ETag") != old_etag


def test_handle_media_html_keeps_no_store(routes, monkeypatch, tmp_path):
    """Regression guard: HTML inline preview must stay no-store (PR #6706)."""
    page = tmp_path / "page.html"
    page.write_text("<html><body>hi</body></html>", encoding="utf-8")
    handler = _media_get(routes, monkeypatch, page)

    assert handler.status == 200
    assert handler.header("Cache-Control") == "no-store"


def test_handle_media_pdf_uses_no_cache(routes, monkeypatch, tmp_path):
    pdf = tmp_path / "doc.pdf"
    pdf.write_bytes(b"%PDF-1.4\n%EOF")
    handler = _media_get(routes, monkeypatch, pdf)

    assert handler.status == 200
    assert handler.header("Cache-Control") == "no-cache"
    assert handler.header("ETag")
