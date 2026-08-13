"""Per-message media snapshots: freeze file bytes at message-settle time.

Problem
-------
``/api/media`` serves a file's CURRENT bytes.  Since the ETag-revalidation
work (#6922) made browsers revalidate on every use, an in-place overwrite of
``report.html`` also rewrites every historical chat preview that referenced
it — the user loses the old/new comparison they had when the agent emitted
the file twice under the same name.

This module is the storage half of the fix.  When a turn settles
(``api/streaming.py``), every local-file ``MEDIA:`` reference in the new
assistant messages is snapshotted into a content-addressed store:

    <STATE_DIR>/media_snapshots/<sha256>.snap

Content addressing gives free dedup (an unchanged file re-settles to the
same digest and the copy is skipped) and makes every stored object
IMMUTABLE — the serving side can therefore cache snapshots aggressively.
Messages carry a ``_media_snapshots`` annotation mapping absolute path to
digest (sidecar JSON preserves extra message fields); the frontend appends
``&snap=<digest>`` to ``/api/media`` URLs and ``api/routes.py`` serves the
stored bytes instead of the live file.

Security model
--------------
* Digests are validated against ``^[0-9a-f]{64}$`` before any path is built —
  a crafted ``snap=`` value cannot traverse out of the store.
* The store lives under STATE_DIR; capture is restricted to files that are
  regular files within caller-approved roots (the caller reuses the same
  allow-list reasoning as ``/api/media`` — this module never decides what a
  user may see, only stores bytes it is handed).
* Writes are tmp-file + fsync + rename: a crash never leaves a torn
  snapshot that would serve corrupt bytes forever (content addressing means
  a torn file could never be overwritten with good bytes later).

Caps
----
* Per-file cap (default 50 MB): larger files are not snapshotted; previews
  for them gracefully degrade to the live file.
* Total store cap (default 2 GB): when exceeded after a capture, oldest
  snapshots (by mtime) are evicted until the store fits.  Eviction only
  degrades OLD previews to live-file behaviour; it never corrupts anything.
"""

from __future__ import annotations

import hashlib
import logging
import os
import re
import threading
from pathlib import Path

logger = logging.getLogger("hermes.webui")

_DIGEST_RE = re.compile(r"^[0-9a-f]{64}$")

# Default caps.  Overridable via env var for operators with unusual disks.
DEFAULT_MAX_FILE_BYTES = 50 * 1024 * 1024          # 50 MB per snapshot
DEFAULT_TOTAL_CAP_BYTES = 2 * 1024 * 1024 * 1024   # 2 GB total store

_SNAPSHOT_DIR_ENV = "HERMES_WEBUI_MEDIA_SNAPSHOT_DIR"

# Capture and eviction run on the streaming worker thread; serialize them so
# two concurrent settles cannot race the same tmp file or the quota scan.
_LOCK = threading.Lock()

# Internal state filenames/subdirs that must never be snapshotted even when
# they sit under an otherwise-allowed root.  Mirrors the #3234 deny list in
# routes.py ``_handle_media`` — capture is intentionally NARROWER than serve:
# a file that fails this predicate simply degrades to the live-file preview,
# so erring on the deny side can never expose bytes the endpoint would not
# already serve.
_DENY_FILENAMES = {
    "settings.json", "state.db", "state.db-wal", "state.db-shm",
    "auth.json", "auth.lock", "config.yaml", "config.yml", ".env",
    ".signing_key", ".pbkdf2_key", ".sessions.json",
    "google_token.json", "google_client_secret.json",
    "gateway_state.json", "channel_directory.json", "jobs.json",
    "passkeys.json", ".passkey_challenges.json", ".login_attempts.json",
}
_DENY_SUBDIRS = (
    "sessions", "memories", "cron", "logs", "checkpoints", "backups",
)


def _allowed_roots_for_capture() -> list[Path]:
    """Roots capture is permitted in — same shape as ``/api/media``'s list."""
    roots: list[Path] = []
    home = Path(os.path.expanduser("~"))
    hermes_home = Path(os.getenv("HERMES_HOME", str(home / ".hermes"))).expanduser()
    for candidate in (hermes_home, Path("/tmp"), home / ".hermes"):
        try:
            resolved = candidate.resolve()
        except OSError:
            continue
        if resolved not in roots:
            roots.append(resolved)
    try:
        from api.workspace import get_last_workspace

        ws = Path(get_last_workspace()).resolve()
        if ws.is_dir() and ws not in roots:
            roots.append(ws)
    except Exception:
        pass
    extra = os.environ.get("MEDIA_ALLOWED_ROOTS", "").strip()
    if extra:
        for root in extra.split(os.pathsep):
            root = root.strip()
            if not root:
                continue
            try:
                rp = Path(root).resolve()
            except OSError:
                continue
            if rp.is_dir() and rp not in roots:
                roots.append(rp)
    return roots


def _path_within(child: Path, root: Path) -> bool:
    try:
        child.resolve().relative_to(root)
        return True
    except (ValueError, OSError):
        return False


def media_capture_allowed(path: Path) -> bool:
    """Allow-list predicate for snapshot capture (stricter than serve).

    True only when ``path`` is a regular file inside an allowed root and NOT
    inside a denied Hermes-internal state subdir/filename.  Any failure mode
    returns False — snapshotting is best-effort durability, never a reason to
    widen file access.
    """
    import stat as stat_mod

    try:
        resolved = path.resolve()
        st = resolved.stat()
    except OSError:
        return False
    if not stat_mod.S_ISREG(st.st_mode):
        return False

    within_any_root = False
    for root in _allowed_roots_for_capture():
        if _path_within(resolved, root):
            within_any_root = True
            # Denied state subdirs fire even inside a root — a workspace
            # pointed at a state dir must not get its sessions snapshotted.
            for sub in _DENY_SUBDIRS:
                deny_dir = (root / sub).resolve()
                if _path_within(resolved, deny_dir):
                    return False
            if resolved.name.casefold() in {n.casefold() for n in _DENY_FILENAMES}:
                return False
    return within_any_root


def resolve_media_ref(raw_ref: str) -> Path | None:
    """Map a raw ``MEDIA:`` token to an absolute local path, or None.

    Only bare local paths and ``file://`` URLs resolve; http(s)/data/other
    schemes return None (nothing to snapshot — they are not server files).
    ``~`` is expanded.  No existence check: callers decide whether absence
    matters (capture skips missing files).
    """
    ref = str(raw_ref or "").strip()
    if not ref:
        return None
    if ref.startswith("data:") or re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", ref):
        if ref.lower().startswith("file://"):
            from urllib.parse import unquote, urlparse

            try:
                parsed = urlparse(ref)
                ref = unquote(parsed.path or "")
            except Exception:
                ref = ref[len("file://"):]
        else:
            return None
    if not ref or ref.startswith(("http:", "https:")):
        return None
    try:
        return Path(ref).expanduser().resolve()
    except (OSError, RuntimeError):
        return None


def _default_snapshot_dir() -> Path:
    from api.config import STATE_DIR

    return Path(STATE_DIR) / "media_snapshots"


def get_snapshot_dir() -> Path:
    """Snapshot store root (created lazily by capture)."""
    override = os.getenv(_SNAPSHOT_DIR_ENV, "").strip()
    if override:
        return Path(override).expanduser()
    return _default_snapshot_dir()


def is_valid_digest(digest: str) -> bool:
    """Strict digest shape check — the ONLY gate before path construction."""
    return bool(_DIGEST_RE.match(str(digest or "")))


def snapshot_path_for_digest(digest: str) -> Path | None:
    """Return the on-disk path for a digest, or None if absent/invalid.

    Never creates anything; serving uses this to decide snapshot vs live-file
    fallback.
    """
    if not is_valid_digest(digest):
        return None
    candidate = get_snapshot_dir() / f"{digest}.snap"
    return candidate if candidate.is_file() else None


def _total_cap_bytes() -> int:
    try:
        return max(0, int(os.getenv("HERMES_WEBUI_MEDIA_SNAPSHOT_CAP_BYTES", "")))
    except ValueError:
        return DEFAULT_TOTAL_CAP_BYTES


def _max_file_bytes() -> int:
    try:
        return max(0, int(os.getenv("HERMES_WEBUI_MEDIA_SNAPSHOT_MAX_FILE_BYTES", "")))
    except ValueError:
        return DEFAULT_MAX_FILE_BYTES


def _store_size_and_entries(directory: Path) -> tuple[int, list[tuple[float, int, Path]]]:
    """Scan the store: (total bytes, [(mtime, size, path), ...])."""
    total = 0
    entries: list[tuple[float, int, Path]] = []
    try:
        for child in directory.iterdir():
            if child.suffix != ".snap":
                continue
            try:
                st = child.stat()
            except OSError:
                continue
            total += st.st_size
            entries.append((st.st_mtime, st.st_size, child))
    except OSError:
        pass
    return total, entries


def _enforce_quota_locked(directory: Path) -> None:
    """Evict oldest snapshots until the store is under the total cap.

    Caller holds ``_LOCK``.  Eviction is best-effort: an unlink failure is
    logged and skipped, never raised into the settle path.
    """
    cap = _total_cap_bytes()
    total, entries = _store_size_and_entries(directory)
    if total <= cap:
        return
    entries.sort()  # oldest mtime first
    for _mtime, size, path in entries:
        if total <= cap:
            break
        try:
            path.unlink()
            total -= size
            logger.info("media snapshot quota: evicted %s (%d bytes)", path.name, size)
        except OSError as exc:
            logger.debug("media snapshot eviction failed for %s: %s", path, exc)


def capture_snapshot(source: Path, *, max_file_bytes: int | None = None) -> str | None:
    """Copy ``source`` into the content-addressed store; return its digest.

    Returns None (caller falls back to live-file previews) when:
    * the file is missing / not a regular file / unreadable,
    * the file exceeds the per-file cap,
    * any I/O error occurs mid-copy (the torn tmp is removed).

    Never raises — snapshotting is a durability enhancement and must not be
    able to break the settle path.
    """
    cap = _max_file_bytes() if max_file_bytes is None else max_file_bytes
    try:
        st = source.stat()
    except OSError:
        return None
    import stat as stat_mod

    if not stat_mod.S_ISREG(st.st_mode):
        return None
    if cap and st.st_size > cap:
        return None

    with _LOCK:
        directory = get_snapshot_dir()
        try:
            directory.mkdir(parents=True, exist_ok=True)
        except OSError:
            return None

        digest = hashlib.sha256()
        tmp_path: Path | None = None
        try:
            tmp_path = directory / f".tmp.{os.getpid()}.{threading.get_ident()}"
            with open(source, "rb") as src, open(tmp_path, "wb") as dst:
                while True:
                    chunk = src.read(1024 * 1024)
                    if not chunk:
                        break
                    digest.update(chunk)
                    dst.write(chunk)
                dst.flush()
                os.fsync(dst.fileno())
            hex_digest = digest.hexdigest()
            final_path = directory / f"{hex_digest}.snap"
            if final_path.exists():
                # Content already stored (dedup) — drop the duplicate copy.
                try:
                    tmp_path.unlink()
                except OSError:
                    pass
            else:
                os.replace(tmp_path, final_path)
            tmp_path = None
            _enforce_quota_locked(directory)
            return hex_digest
        except OSError as exc:
            logger.debug("media snapshot capture failed for %s: %s", source, exc)
            if tmp_path is not None:
                try:
                    tmp_path.unlink()
                except OSError:
                    pass
            return None


def annotate_media_snapshots(
    messages: list,
    *,
    resolve_ref=None,
    allowed_predicate=None,
) -> int:
    """Scan settled messages and snapshot every local-file MEDIA: reference.

    Writes a ``_media_snapshots`` dict ({absolute path: digest}) onto each
    assistant message that carries at least one local-file ``MEDIA:`` ref.
    Messages whose refs are already fully annotated are skipped (idempotent
    across repeated settles).

    ``resolve_ref(raw_ref) -> Path | None`` maps a raw MEDIA token to an
    absolute file path (defaults to :func:`resolve_media_ref`); refs it cannot
    resolve (remote URLs, data: URIs) are ignored.  ``allowed_predicate(path)
    -> bool`` applies the same allow/deny reasoning as ``/api/media``
    (defaults to :func:`media_capture_allowed`) so the store never receives
    bytes the endpoint would not serve.

    Returns the number of new snapshots captured (0 on a repeat settle).
    """
    import re as _re

    if resolve_ref is None:
        resolve_ref = resolve_media_ref
    if allowed_predicate is None:
        allowed_predicate = media_capture_allowed
    media_re = _re.compile(r"MEDIA:([^\s\)\]]+)")
    captured = 0
    for msg in messages or []:
        if not isinstance(msg, dict) or msg.get("role") != "assistant":
            continue
        content = msg.get("content")
        if not isinstance(content, str) or "MEDIA:" not in content:
            continue
        refs = media_re.findall(content)
        if not refs:
            continue
        existing = msg.get("_media_snapshots")
        snaps = dict(existing) if isinstance(existing, dict) else {}
        changed = False
        for raw_ref in refs:
            if resolve_ref is not None:
                try:
                    path = resolve_ref(raw_ref)
                except Exception:
                    path = None
            else:
                path = None
            if path is None:
                continue
            # Index by BOTH the resolved absolute path and the raw token as the
            # frontend embeds it (file:// unwrapped, ~/ kept verbatim). One of
            # the two always matches the path= query param in the rendered URL.
            keys = [str(path)]
            if raw_ref not in keys:
                keys.append(raw_ref)
            pending = [k for k in keys if not (snaps.get(k) and is_valid_digest(snaps[k]) and snapshot_path_for_digest(snaps[k]))]
            if not pending:
                continue  # already stored under every key — zero-I/O fast path
            if allowed_predicate is not None:
                try:
                    if not allowed_predicate(path):
                        continue
                except Exception:
                    continue
            digest = capture_snapshot(path)
            if digest:
                for k in keys:
                    snaps[k] = digest
                changed = True
                captured += 1
        if changed:
            msg["_media_snapshots"] = snaps
    return captured
