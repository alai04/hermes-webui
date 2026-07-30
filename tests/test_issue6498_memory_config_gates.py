"""
Regression tests for PR #6498: memory_enabled and user_profile_enabled config gates.

Checks that _handle_memory_read and _handle_memory_write respect the per-profile
config flags, and that get_config_snapshot() (not get_config()) prevents the
process-global cache race across profiles.
"""
import io
import json
import pathlib
from unittest.mock import MagicMock

import pytest


@pytest.fixture
def fake_profile_home(tmp_path):
    """Create a temp profile home with memory files and a config."""
    mem_dir = tmp_path / "memories"
    mem_dir.mkdir(parents=True)
    (mem_dir / "MEMORY.md").write_text("This is my memory content", encoding="utf-8")
    (mem_dir / "USER.md").write_text("This is my user profile", encoding="utf-8")
    (tmp_path / "SOUL.md").write_text("This is my soul", encoding="utf-8")
    return tmp_path


@pytest.fixture
def mock_handler():
    """Create a mock HTTP handler that captures response status and body."""
    h = MagicMock()
    h.wfile = io.BytesIO()

    def send_response(status):
        h.status = status

    def send_header(k, v):
        pass

    h.send_response = send_response
    h.send_header = send_header
    h.end_headers = MagicMock()
    return h


def _body_from_handler(handler):
    """Deserialize JSON from the handler's wfile buffer."""
    return json.loads(handler.wfile.getvalue().decode("utf-8"))


@pytest.fixture(autouse=True)
def _patch_get_active_hermes_home(monkeypatch, fake_profile_home):
    """Patch get_active_hermes_home at its source (api.profiles) so all
    internal imports within handler functions see the mock."""
    monkeypatch.setattr("api.profiles.get_active_hermes_home", lambda: fake_profile_home)


class TestMemoryReadConfigGates:
    """_handle_memory_read respects memory_enabled and user_profile_enabled."""

    def test_read_memory_disabled(self, mock_handler, fake_profile_home, monkeypatch):
        import api.routes as routes

        monkeypatch.setattr(routes, "get_config_snapshot", lambda: {"memory_enabled": False})

        routes._handle_memory_read(mock_handler)

        assert mock_handler.status == 200
        body = _body_from_handler(mock_handler)
        assert body["memory"] == ""
        assert body["memory_path"] == ""
        assert body["memory_mtime"] is None
        # user should still be readable (not disabled)
        assert body["user"] == "This is my user profile"
        assert body["user_path"] != ""
        assert body["user_mtime"] is not None
        # soul always readable
        assert body["soul"] == "This is my soul"

    def test_read_user_profile_disabled(self, mock_handler, fake_profile_home, monkeypatch):
        import api.routes as routes

        monkeypatch.setattr(routes, "get_config_snapshot", lambda: {"user_profile_enabled": False})

        routes._handle_memory_read(mock_handler)

        assert mock_handler.status == 200
        body = _body_from_handler(mock_handler)
        assert body["user"] == ""
        assert body["user_path"] == ""
        assert body["user_mtime"] is None
        # memory should still be readable
        assert body["memory"] == "This is my memory content"
        assert body["memory_path"] != ""
        assert body["memory_mtime"] is not None

    def test_read_both_disabled(self, mock_handler, fake_profile_home, monkeypatch):
        import api.routes as routes

        monkeypatch.setattr(
            routes,
            "get_config_snapshot",
            lambda: {"memory_enabled": False, "user_profile_enabled": False},
        )

        routes._handle_memory_read(mock_handler)

        assert mock_handler.status == 200
        body = _body_from_handler(mock_handler)
        assert body["memory"] == ""
        assert body["memory_path"] == ""
        assert body["memory_mtime"] is None
        assert body["user"] == ""
        assert body["user_path"] == ""
        assert body["user_mtime"] is None
        # soul always readable
        assert body["soul"] == "This is my soul"

    def test_read_default_true_when_key_missing(self, mock_handler, fake_profile_home, monkeypatch):
        """When config keys are absent, both default to True (backward compat)."""
        import api.routes as routes

        monkeypatch.setattr(routes, "get_config_snapshot", lambda: {})

        routes._handle_memory_read(mock_handler)

        assert mock_handler.status == 200
        body = _body_from_handler(mock_handler)
        assert body["memory"] == "This is my memory content"
        assert body["user"] == "This is my user profile"
        assert body["soul"] == "This is my soul"

    def test_read_soul_unaffected_by_disabled_flags(self, mock_handler, fake_profile_home, monkeypatch):
        """Soul section is unaffected by both flags."""
        import api.routes as routes

        monkeypatch.setattr(
            routes,
            "get_config_snapshot",
            lambda: {"memory_enabled": False, "user_profile_enabled": False},
        )

        routes._handle_memory_read(mock_handler)

        body = _body_from_handler(mock_handler)
        assert body["soul"] == "This is my soul"
        assert body["soul_path"] != ""
        assert body["soul_mtime"] is not None


class TestMemoryWriteConfigGates:
    """_handle_memory_write returns 403 for disabled sections."""

    def test_write_memory_disabled(self, mock_handler, fake_profile_home, monkeypatch):
        import api.routes as routes

        monkeypatch.setattr(routes, "get_config_snapshot", lambda: {"memory_enabled": False})

        routes._handle_memory_write(mock_handler, {"section": "memory", "content": "new content"})

        assert mock_handler.status == 403
        body = _body_from_handler(mock_handler)
        assert "disabled" in body.get("error", "").lower()

    def test_write_user_profile_disabled(self, mock_handler, fake_profile_home, monkeypatch):
        import api.routes as routes

        monkeypatch.setattr(routes, "get_config_snapshot", lambda: {"user_profile_enabled": False})

        routes._handle_memory_write(mock_handler, {"section": "user", "content": "new profile"})

        assert mock_handler.status == 403
        body = _body_from_handler(mock_handler)
        assert "disabled" in body.get("error", "").lower()

    def test_write_soul_unaffected(self, mock_handler, fake_profile_home, monkeypatch):
        """Soul section writes are unaffected by both flags."""
        import api.routes as routes

        monkeypatch.setattr(
            routes,
            "get_config_snapshot",
            lambda: {"memory_enabled": False, "user_profile_enabled": False},
        )

        soul_path = fake_profile_home / "SOUL.md"

        routes._handle_memory_write(mock_handler, {"section": "soul", "content": "updated soul"})

        assert mock_handler.status == 200
        body = _body_from_handler(mock_handler)
        assert body["ok"] is True
        # Verify the file was actually written
        assert soul_path.read_text(encoding="utf-8") == "updated soul"

    def test_write_allowed_when_enabled(self, mock_handler, fake_profile_home, monkeypatch):
        """Happy path: writes go through when the relevant flag is enabled."""
        import api.routes as routes

        monkeypatch.setattr(
            routes,
            "get_config_snapshot",
            lambda: {"memory_enabled": True, "user_profile_enabled": True},
        )

        # Write memory
        mem_file = fake_profile_home / "memories" / "MEMORY.md"
        routes._handle_memory_write(mock_handler, {"section": "memory", "content": "updated memory"})
        assert mock_handler.status == 200
        assert mem_file.read_text(encoding="utf-8") == "updated memory"

        # Write user
        user_file = fake_profile_home / "memories" / "USER.md"
        routes._handle_memory_write(mock_handler, {"section": "user", "content": "updated user"})
        assert mock_handler.status == 200
        assert user_file.read_text(encoding="utf-8") == "updated user"


class TestProfileIsolation:
    """The config snapshot must be request-owned, not the process-global _cfg_cache."""

    def test_snapshot_is_independent_after_reload(self, monkeypatch, tmp_path):
        """
        get_config_snapshot() returns a deep copy under the cache lock, so
        mutating the original cache after the snapshot is taken doesn't affect
        the snapshot. This proves profile-isolation: profile A's snapshot stays
        frozen even if profile B's config reload changes the shared cache.
        """
        import api.routes as routes

        mock_snapshot = {"memory_enabled": False, "user_profile_enabled": True}
        call_count = {"n": 0}

        def counting_snapshot():
            call_count["n"] += 1
            if call_count["n"] == 1:
                return dict(mock_snapshot)  # profile A
            else:
                return {"memory_enabled": True, "user_profile_enabled": True}  # profile B

        monkeypatch.setattr(routes, "get_config_snapshot", counting_snapshot)

        mock_h = MagicMock()
        mock_h.wfile = io.BytesIO()
        mock_h.send_response = lambda s: setattr(mock_h, "status", s)
        mock_h.send_header = lambda k, v: None
        mock_h.end_headers = MagicMock()

        assert call_count["n"] == 0
        monkeypatch.setattr("api.profiles.get_active_hermes_home", lambda: tmp_path)
        (tmp_path / "memories").mkdir(parents=True, exist_ok=True)
        (tmp_path / "memories" / "MEMORY.md").write_text("test", encoding="utf-8")
        (tmp_path / "memories" / "USER.md").write_text("test", encoding="utf-8")
        (tmp_path / "SOUL.md").write_text("test", encoding="utf-8")

        routes._handle_memory_read(mock_h)

        assert call_count["n"] == 1, "get_config_snapshot should be called exactly once per read request"

    def test_disabled_profile_write_cannot_be_allowed_by_other_profile_reload(self, monkeypatch, tmp_path):
        """
        Profile A has memory_enabled: false. Profile B has memory_enabled: true.
        A concurrent reload for profile B must not allow A's write to go through.
        """
        import api.routes as routes

        profile_a_home = tmp_path / "profile_a"
        profile_a_home.mkdir()
        (profile_a_home / "memories").mkdir()
        mem_file = profile_a_home / "memories" / "MEMORY.md"
        mem_file.write_text("original", encoding="utf-8")

        snapshot_call = {"count": 0}

        def per_profile_snapshot():
            """Return profile A config first, profile B config second (simulating reload)."""
            snapshot_call["count"] += 1
            if snapshot_call["count"] == 1:
                return {"memory_enabled": False, "user_profile_enabled": True}
            else:
                return {"memory_enabled": True, "user_profile_enabled": True}

        monkeypatch.setattr(routes, "get_config_snapshot", per_profile_snapshot)
        monkeypatch.setattr("api.profiles.get_active_hermes_home", lambda: profile_a_home)

        mock_h = MagicMock()
        mock_h.wfile = io.BytesIO()
        mock_h.send_response = lambda s: setattr(mock_h, "status", s)
        mock_h.send_header = lambda k, v: None
        mock_h.end_headers = MagicMock()

        routes._handle_memory_write(mock_h, {"section": "memory", "content": "should be blocked"})

        # Profile A has memory_enabled: false -> write should be 403
        assert mock_h.status == 403, (
            f"Expected 403 for disabled profile A, got {mock_h.status}"
        )
        # File must NOT have been modified
        assert mem_file.read_text(encoding="utf-8") == "original", (
            "Profile A's MEMORY.md must remain unchanged when memory_enabled: false"
        )
        # The second call (profile B's config) must NOT be used for profile A's check
        assert snapshot_call["count"] == 1, (
            "get_config_snapshot should be called exactly once; "
            "the profile B reload must not affect profile A's check"
        )
