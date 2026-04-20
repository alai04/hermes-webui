# Hermes WebUI — API Contract

> Auto-generated from `api/routes.py` · Hermes WebUI v0.50.x

All endpoints return JSON (`application/json`) unless noted otherwise.
POST endpoints require a JSON request body and are protected by CSRF origin checking.
When password authentication is enabled (`HERMES_WEBUI_PASSWORD`), all endpoints require a valid session cookie.

---

## Table of Contents

- [Pages / Static](#pages--static)
- [Auth](#auth)
- [Health](#health)
- [Sessions](#sessions)
- [Chat](#chat)
- [Models](#models)
- [Settings](#settings)
- [Onboarding](#onboarding)
- [Workspaces](#workspaces)
- [File Operations](#file-operations)
- [Cron Jobs](#cron-jobs)
- [Skills](#skills)
- [Memory](#memory)
- [Profiles](#profiles)
- [Projects](#projects)
- [Approvals](#approvals)
- [Clarify Prompts](#clarify-prompts)
- [Updates](#updates)
- [Upload / Transcribe](#upload--transcribe)
- [Personalities](#personalities)

---

## Pages / Static

### `GET /`  &  `GET /index.html`

| Field | Value |
|-------|-------|
| **Description** | Serve the main single-page application HTML |
| **Response** | `text/html` — raw HTML of the SPA |

### `GET /login`

| Field | Value |
|-------|-------|
| **Description** | Serve the login page (self-contained, no external deps). Locale is resolved from the `language` setting. |
| **Response** | `text/html` — login form page |

### `GET /favicon.ico`

| Field | Value |
|-------|-------|
| **Description** | Serve the favicon (SVG/PNG/ICO) |
| **Response** | `image/x-icon` with `Cache-Control: public, max-age=86400`, or `204 No Content` if not found |

### `GET /static/{path}`

| Field | Value |
|-------|-------|
| **Description** | Serve static assets (JS, CSS, images, fonts) from the `static/` directory |
| **Params** | `path` (URL path) — relative file path within `static/` |
| **Response** | File contents with appropriate MIME type. `404` if not found or path traversal detected. |

---

## Auth

### `GET /api/auth/status`

| Field | Value |
|-------|-------|
| **Description** | Check whether password authentication is enabled and whether the current request has a valid session |
| **Params** | None |
| **Response** | `{ "auth_enabled": bool, "logged_in": bool }` |

### `POST /api/auth/login`

| Field | Value |
|-------|-------|
| **Description** | Authenticate with a password. Sets an HMAC-signed session cookie on success. Rate-limited per client IP. |
| **Body** | `{ "password": string }` |
| **Response (200)** | `{ "ok": true }` + `Set-Cookie` header |
| **Response (401)** | `{ "error": "Invalid password" }` |
| **Response (429)** | `{ "error": "Too many attempts. Try again in a minute." }` |

### `POST /api/auth/logout`

| Field | Value |
|-------|-------|
| **Description** | Invalidate the current session and clear the auth cookie |
| **Body** | `{}` (empty) |
| **Response** | `{ "ok": true }` + cleared cookie |

---

## Health

### `GET /health`

| Field | Value |
|-------|-------|
| **Description** | Server health check |
| **Params** | None |
| **Response** | `{ "status": "ok", "sessions": int, "active_streams": int, "uptime_seconds": float }` |

---

## Sessions

### `GET /api/sessions`

| Field | Value |
|-------|-------|
| **Description** | List all sessions (WebUI + optionally CLI sessions), sorted by `updated_at` descending |
| **Params** | None |
| **Response** | `{ "sessions": [ SessionCompact, ... ], "cli_count": int }` |

### `GET /api/session`

| Field | Value |
|-------|-------|
| **Description** | Get a single session by ID, including full message history. Falls back to CLI session store if not found in WebUI. |
| **Query Params** | `session_id` (string, **required**) |
| **Response (200)** | `{ "session": { ...SessionCompact, "messages": [...], "tool_calls": [...], "active_stream_id": string\|null, "pending_user_message": string\|null, "pending_attachments": [...], "pending_started_at": float\|null } }` |
| **Response (400)** | `{ "error": "session_id is required" }` |
| **Response (404)** | `{ "error": "Session not found" }` |

### `GET /api/session/export`

| Field | Value |
|-------|-------|
| **Description** | Export a session as a downloadable JSON file |
| **Query Params** | `session_id` (string, **required**) |
| **Response (200)** | `application/json` with `Content-Disposition: attachment; filename="hermes-{sid}.json"` |
| **Response (400)** | `{ "error": "session_id is required" }` |
| **Response (404)** | `{ "error": "Session not found" }` |

### `GET /api/sessions/search`

| Field | Value |
|-------|-------|
| **Description** | Search sessions by title and optionally by message content |
| **Query Params** | `q` (string, **required**) — search query; `content` (string, default `"1"`) — `"1"` to search message content; `depth` (int, default `5`) — max messages to search per session |
| **Response** | `{ "sessions": [ { ...SessionCompact, "match_type": "title"\|"content" }, ... ], "query": string, "count": int }` |

### `POST /api/session/new`

| Field | Value |
|-------|-------|
| **Description** | Create a new chat session |
| **Body** | `{ "workspace"?: string, "model"?: string }` |
| **Response** | `{ "session": { ...SessionCompact, "messages": [] } }` |

### `POST /api/session/rename`

| Field | Value |
|-------|-------|
| **Description** | Rename a session (max 80 chars) |
| **Body** | `{ "session_id": string, "title": string }` — both **required** |
| **Response** | `{ "session": SessionCompact }` |

### `POST /api/session/update`

| Field | Value |
|-------|-------|
| **Description** | Update session workspace and/or model |
| **Body** | `{ "session_id": string, "workspace"?: string, "model"?: string }` — `session_id` **required** |
| **Response** | `{ "session": { ...SessionCompact, "messages": [...] } }` |

### `POST /api/session/delete`

| Field | Value |
|-------|-------|
| **Description** | Delete a session from both WebUI and CLI stores |
| **Body** | `{ "session_id": string }` — **required** (alphanumeric + underscore only) |
| **Response** | `{ "ok": true }` |

### `POST /api/session/clear`

| Field | Value |
|-------|-------|
| **Description** | Clear all messages and tool calls from a session, reset title to "Untitled" |
| **Body** | `{ "session_id": string }` — **required** |
| **Response** | `{ "ok": true, "session": SessionCompact }` |

### `POST /api/session/truncate`

| Field | Value |
|-------|-------|
| **Description** | Truncate session messages to keep only the first N messages |
| **Body** | `{ "session_id": string, "keep_count": int }` — both **required** |
| **Response** | `{ "ok": true, "session": { ...SessionCompact, "messages": [...] } }` |

### `POST /api/session/pin`

| Field | Value |
|-------|-------|
| **Description** | Pin or unpin a session |
| **Body** | `{ "session_id": string, "pinned"?: bool }` — `session_id` **required**, `pinned` defaults to `true` |
| **Response** | `{ "ok": true, "session": SessionCompact }` |

### `POST /api/session/archive`

| Field | Value |
|-------|-------|
| **Description** | Archive or unarchive a session |
| **Body** | `{ "session_id": string, "archived"?: bool }` — `session_id` **required**, `archived` defaults to `true` |
| **Response** | `{ "ok": true, "session": SessionCompact }` |

### `POST /api/session/move`

| Field | Value |
|-------|-------|
| **Description** | Move a session to a project (or remove from project) |
| **Body** | `{ "session_id": string, "project_id"?: string\|null }` — `session_id` **required** |
| **Response** | `{ "ok": true, "session": SessionCompact }` |

### `POST /api/session/import`

| Field | Value |
|-------|-------|
| **Description** | Import a session from a JSON export. Creates a new session with a new ID. |
| **Body** | `{ "messages": [...], "title"?: string, "workspace"?: string, "model"?: string, "tool_calls"?: [...], "pinned"?: bool }` — `messages` **required** |
| **Response** | `{ "ok": true, "session": { ...SessionCompact, "messages": [...] } }` |

### `POST /api/session/import_cli`

| Field | Value |
|-------|-------|
| **Description** | Import a CLI session into the WebUI store. Idempotent — returns existing if already imported. |
| **Body** | `{ "session_id": string }` — **required** |
| **Response** | `{ "session": { ...SessionCompact, "messages": [...], "is_cli_session": true }, "imported": bool }` |

### `POST /api/sessions/cleanup`

| Field | Value |
|-------|-------|
| **Description** | Delete sessions with title "Untitled" and zero messages |
| **Body** | `{}` (empty) |
| **Response** | `{ "ok": true, "cleaned": int }` |

### `POST /api/sessions/cleanup_zero_message`

| Field | Value |
|-------|-------|
| **Description** | Delete all sessions with zero messages (regardless of title) |
| **Body** | `{}` (empty) |
| **Response** | `{ "ok": true, "cleaned": int }` |

---

## Chat

### `POST /api/chat/start`

| Field | Value |
|-------|-------|
| **Description** | Start a streaming chat. Creates a background agent thread and returns a `stream_id` for SSE consumption. Rejects if a stream is already active for the session. |
| **Body** | `{ "session_id": string, "message": string, "attachments"?: string[] (max 20), "workspace"?: string, "model"?: string }` — `session_id` and `message` **required** |
| **Response (200)** | `{ "stream_id": string, "session_id": string }` |
| **Response (409)** | `{ "error": "session already has an active stream", "active_stream_id": string }` |

### `GET /api/chat/stream`

| Field | Value |
|-------|-------|
| **Description** | SSE endpoint to consume a chat stream started by `/api/chat/start` |
| **Query Params** | `stream_id` (string, **required**) |
| **Response** | `text/event-stream` — Events: `token`, `tool_start`, `tool_end`, `stream_end`, `error`, `cancel`. Heartbeat sent every 30s. |
| **Response (404)** | `{ "error": "stream not found" }` |

### `GET /api/chat/stream/status`

| Field | Value |
|-------|-------|
| **Description** | Check whether a stream is still active |
| **Query Params** | `stream_id` (string) |
| **Response** | `{ "active": bool, "stream_id": string }` |

### `GET /api/chat/cancel`

| Field | Value |
|-------|-------|
| **Description** | Cancel an active chat stream |
| **Query Params** | `stream_id` (string, **required**) |
| **Response** | `{ "ok": true, "cancelled": bool, "stream_id": string }` |

### `POST /api/chat`

| Field | Value |
|-------|-------|
| **Description** | Synchronous (blocking) chat endpoint. Not used by the frontend — fallback for programmatic access. |
| **Body** | `{ "session_id": string, "message": string, "workspace"?: string, "model"?: string }` |
| **Response** | `{ "answer": string, "status": "done"\|"partial", "session": { ...SessionCompact, "messages": [...] }, "result": { ... } }` |

### `GET /api/sessions/gateway/stream`

| Field | Value |
|-------|-------|
| **Description** | SSE endpoint for real-time gateway/CLI session updates. Streams change events from the gateway watcher. Only available when `show_cli_sessions` setting is enabled. |
| **Params** | None |
| **Response** | `text/event-stream` — Event type: `sessions_changed` with `{ "sessions": [...] }`. Keepalive every 30s. |
| **Response (404)** | `{ "error": "agent sessions not enabled" }` |
| **Response (503)** | `{ "error": "watcher not started" }` |

---

## Models

### `GET /api/models`

| Field | Value |
|-------|-------|
| **Description** | Get the static list of available models (from config) |
| **Params** | None |
| **Response** | `[ { "id": string, "label": string, "provider"?: string, ... }, ... ]` |

### `GET /api/models/live`

| Field | Value |
|-------|-------|
| **Description** | Fetch the live model list from a provider's API (OpenRouter, Anthropic, Copilot, etc.). Falls back to static catalog on failure. |
| **Query Params** | `provider` (string, optional) — provider ID; defaults to active profile provider |
| **Response** | `{ "provider": string, "models": [ { "id": string, "label": string }, ... ], "count": int }` |
| **Error** | `{ "error": string, "models": [] }` |

---

## Settings

### `GET /api/settings`

| Field | Value |
|-------|-------|
| **Description** | Get all settings (password hash is stripped) |
| **Params** | None |
| **Response** | `{ "bot_name"?: string, "theme"?: string, "language"?: string, "show_cli_sessions"?: bool, ... }` |

### `POST /api/settings`

| Field | Value |
|-------|-------|
| **Description** | Update settings. Can also set/change password via `_set_password` field. If auth was just enabled, auto-creates a session cookie. |
| **Body** | `{ ...any settings keys, "_set_password"?: string }` |
| **Response** | `{ ...saved settings, "auth_enabled": bool, "logged_in": bool, "auth_just_enabled": bool }` |

---

## Onboarding

### `GET /api/onboarding/status`

| Field | Value |
|-------|-------|
| **Description** | Get the current onboarding status (whether setup is complete, which providers are configured, etc.) |
| **Params** | None |
| **Response** | `{ ...onboarding status object }` |

### `POST /api/onboarding/setup`

| Field | Value |
|-------|-------|
| **Description** | Apply onboarding setup (e.g. API keys). Restricted to local/private networks unless auth is enabled or `HERMES_WEBUI_ONBOARDING_OPEN=1`. |
| **Body** | Provider-specific setup object |
| **Response** | `{ ...setup result }` |
| **Response (403)** | Blocked if remote client without auth |

### `POST /api/onboarding/complete`

| Field | Value |
|-------|-------|
| **Description** | Mark onboarding as complete |
| **Body** | `{}` (empty) |
| **Response** | `{ ...completion result }` |

---

## Workspaces

### `GET /api/workspaces`

| Field | Value |
|-------|-------|
| **Description** | List all saved workspaces and the last-used workspace |
| **Params** | None |
| **Response** | `{ "workspaces": [ { "path": string, "name": string }, ... ], "last": string }` |

### `POST /api/workspaces/add`

| Field | Value |
|-------|-------|
| **Description** | Add a workspace to the saved list |
| **Body** | `{ "path": string, "name"?: string }` — `path` **required** |
| **Response** | `{ "ok": true, "workspaces": [...] }` |

### `POST /api/workspaces/remove`

| Field | Value |
|-------|-------|
| **Description** | Remove a workspace from the saved list |
| **Body** | `{ "path": string }` — **required** |
| **Response** | `{ "ok": true, "workspaces": [...] }` |

### `POST /api/workspaces/rename`

| Field | Value |
|-------|-------|
| **Description** | Rename a saved workspace |
| **Body** | `{ "path": string, "name": string }` — both **required** |
| **Response** | `{ "ok": true, "workspaces": [...] }` |

---

## File Operations

### `GET /api/list`

| Field | Value |
|-------|-------|
| **Description** | List directory contents in a session's workspace |
| **Query Params** | `session_id` (string, **required**); `path` (string, default `"."`) — relative path within workspace |
| **Response** | `{ "entries": [ { "name": string, "type": "file"\|"dir", "size"?: int, ... }, ... ], "path": string }` |

### `GET /api/file`

| Field | Value |
|-------|-------|
| **Description** | Read a file's content (text) from a session's workspace |
| **Query Params** | `session_id` (string, **required**); `path` (string, **required**) — relative path within workspace |
| **Response** | `{ "content": string, "path": string, "size": int, "mime": string, ... }` |

### `GET /api/file/raw`

| Field | Value |
|-------|-------|
| **Description** | Serve a raw file from a session's workspace (for download or inline display) |
| **Query Params** | `session_id` (string, **required**); `path` (string, **required**); `download` (string, optional) — `"1"` to force download |
| **Response** | Raw file bytes with appropriate MIME type and Content-Disposition header. HTML/SVG always forced to download (XSS mitigation). |

### `GET /api/media`

| Field | Value |
|-------|-------|
| **Description** | Serve a local file by absolute path for inline display in chat. Path must be within allowed roots (hermes home, /tmp, active workspace). |
| **Query Params** | `path` (string, **required**) — absolute file path |
| **Response** | Raw file bytes. Images served inline; non-images and SVG forced to download. |
| **Response (403)** | `{ "error": "Path not in allowed location" }` |

### `POST /api/file/save`

| Field | Value |
|-------|-------|
| **Description** | Save/overwrite a file in a session's workspace |
| **Body** | `{ "session_id": string, "path": string, "content"?: string }` — `session_id` and `path` **required** |
| **Response** | `{ "ok": true, "path": string, "size": int }` |

### `POST /api/file/create`

| Field | Value |
|-------|-------|
| **Description** | Create a new file in a session's workspace (fails if file already exists) |
| **Body** | `{ "session_id": string, "path": string, "content"?: string }` — `session_id` and `path` **required** |
| **Response** | `{ "ok": true, "path": string }` |

### `POST /api/file/delete`

| Field | Value |
|-------|-------|
| **Description** | Delete a file from a session's workspace (directories not allowed) |
| **Body** | `{ "session_id": string, "path": string }` — both **required** |
| **Response** | `{ "ok": true, "path": string }` |

### `POST /api/file/rename`

| Field | Value |
|-------|-------|
| **Description** | Rename a file within the same directory in a session's workspace |
| **Body** | `{ "session_id": string, "path": string, "new_name": string }` — all **required** |
| **Response** | `{ "ok": true, "old_path": string, "new_path": string }` |

### `POST /api/file/create-dir`

| Field | Value |
|-------|-------|
| **Description** | Create a new directory in a session's workspace |
| **Body** | `{ "session_id": string, "path": string }` — both **required** |
| **Response** | `{ "ok": true, "path": string }` |

---

## Cron Jobs

### `GET /api/crons`

| Field | Value |
|-------|-------|
| **Description** | List all cron jobs (including disabled) |
| **Params** | None |
| **Response** | `{ "jobs": [ { "id": string, "name": string, "schedule": string, "prompt": string, "enabled": bool, ... }, ... ] }` |

### `GET /api/crons/output`

| Field | Value |
|-------|-------|
| **Description** | Get recent output files for a cron job |
| **Query Params** | `job_id` (string, **required**); `limit` (int, default `5`) — max files to return |
| **Response** | `{ "job_id": string, "outputs": [ { "filename": string, "content": string (max 8000 chars) }, ... ] }` |

### `GET /api/crons/recent`

| Field | Value |
|-------|-------|
| **Description** | Get cron jobs that completed since a given timestamp |
| **Query Params** | `since` (float, default `0`) — Unix timestamp |
| **Response** | `{ "completions": [ { "job_id": string, "name": string, "status": string, "completed_at": float }, ... ], "since": float }` |

### `POST /api/crons/create`

| Field | Value |
|-------|-------|
| **Description** | Create a new cron job |
| **Body** | `{ "prompt": string, "schedule": string, "name"?: string, "deliver"?: string (default "local"), "skills"?: string[], "model"?: string }` — `prompt` and `schedule` **required** |
| **Response** | `{ "ok": true, "job": { ...job object } }` |

### `POST /api/crons/update`

| Field | Value |
|-------|-------|
| **Description** | Update an existing cron job |
| **Body** | `{ "job_id": string, ...fields to update }` — `job_id` **required** |
| **Response** | `{ "ok": true, "job": { ...job object } }` |

### `POST /api/crons/delete`

| Field | Value |
|-------|-------|
| **Description** | Delete a cron job |
| **Body** | `{ "job_id": string }` — **required** |
| **Response** | `{ "ok": true, "job_id": string }` |

### `POST /api/crons/run`

| Field | Value |
|-------|-------|
| **Description** | Manually trigger a cron job to run immediately (async) |
| **Body** | `{ "job_id": string }` — **required** |
| **Response** | `{ "ok": true, "job_id": string, "status": "triggered" }` |

### `POST /api/crons/pause`

| Field | Value |
|-------|-------|
| **Description** | Pause (disable) a cron job |
| **Body** | `{ "job_id": string, "reason"?: string }` — `job_id` **required** |
| **Response** | `{ "ok": true, "job": { ...job object } }` |

### `POST /api/crons/resume`

| Field | Value |
|-------|-------|
| **Description** | Resume (re-enable) a paused cron job |
| **Body** | `{ "job_id": string }` — **required** |
| **Response** | `{ "ok": true, "job": { ...job object } }` |

---

## Skills

### `GET /api/skills`

| Field | Value |
|-------|-------|
| **Description** | List all available skills |
| **Params** | None |
| **Response** | `{ "skills": [ { "name": string, "description"?: string, "category"?: string, ... }, ... ] }` |

### `GET /api/skills/content`

| Field | Value |
|-------|-------|
| **Description** | View a skill's SKILL.md content, or a linked file within a skill directory |
| **Query Params** | `name` (string, **required**); `file` (string, optional) — relative file path within skill directory |
| **Response (skill)** | `{ "content": string, "linked_files": { ... }, ... }` |
| **Response (file)** | `{ "content": string, "path": string }` |

### `POST /api/skills/save`

| Field | Value |
|-------|-------|
| **Description** | Create or update a skill |
| **Body** | `{ "name": string, "content": string, "category"?: string }` — `name` and `content` **required** |
| **Response** | `{ "ok": true, "name": string, "path": string }` |

### `POST /api/skills/delete`

| Field | Value |
|-------|-------|
| **Description** | Delete a skill and its directory |
| **Body** | `{ "name": string }` — **required** |
| **Response** | `{ "ok": true, "name": string }` |

---

## Memory

### `GET /api/memory`

| Field | Value |
|-------|-------|
| **Description** | Read the agent's memory (MEMORY.md) and user profile (USER.md) |
| **Params** | None |
| **Response** | `{ "memory": string, "user": string, "memory_path": string, "user_path": string, "memory_mtime": float\|null, "user_mtime": float\|null }` |

### `POST /api/memory/write`

| Field | Value |
|-------|-------|
| **Description** | Write to a memory file (MEMORY.md or USER.md) |
| **Body** | `{ "section": "memory"\|"user", "content": string }` — both **required** |
| **Response** | `{ "ok": true, "section": string, "path": string }` |

---

## Profiles

### `GET /api/profiles`

| Field | Value |
|-------|-------|
| **Description** | List all profiles and the active profile name |
| **Params** | None |
| **Response** | `{ "profiles": [ { "name": string, ... }, ... ], "active": string }` |

### `GET /api/profile/active`

| Field | Value |
|-------|-------|
| **Description** | Get the active profile name and its hermes home path |
| **Params** | None |
| **Response** | `{ "name": string, "path": string }` |

### `POST /api/profile/switch`

| Field | Value |
|-------|-------|
| **Description** | Switch to a different profile |
| **Body** | `{ "name": string }` — **required** |
| **Response** | `{ ...switch result }` |
| **Response (404)** | Profile not found |
| **Response (409)** | Runtime conflict |

### `POST /api/profile/create`

| Field | Value |
|-------|-------|
| **Description** | Create a new profile. Name must match `^[a-z0-9][a-z0-9_-]{0,63}$`. |
| **Body** | `{ "name": string, "clone_from"?: string, "clone_config"?: bool, "base_url"?: string, "api_key"?: string }` — `name` **required** |
| **Response** | `{ "ok": true, "profile": { ... } }` |

### `POST /api/profile/delete`

| Field | Value |
|-------|-------|
| **Description** | Delete a profile |
| **Body** | `{ "name": string }` — **required** |
| **Response** | `{ ...delete result }` |

---

## Projects

### `GET /api/projects`

| Field | Value |
|-------|-------|
| **Description** | List all projects |
| **Params** | None |
| **Response** | `{ "projects": [ { "project_id": string, "name": string, "color"?: string, "created_at": float }, ... ] }` |

### `POST /api/projects/create`

| Field | Value |
|-------|-------|
| **Description** | Create a new project |
| **Body** | `{ "name": string, "color"?: string }` — `name` **required** (max 128 chars). `color` must match `^#[0-9a-fA-F]{3,8}$`. |
| **Response** | `{ "ok": true, "project": { "project_id": string, "name": string, "color": string\|null, "created_at": float } }` |

### `POST /api/projects/rename`

| Field | Value |
|-------|-------|
| **Description** | Rename a project and/or change its color |
| **Body** | `{ "project_id": string, "name": string, "color"?: string }` — `project_id` and `name` **required** |
| **Response** | `{ "ok": true, "project": { ... } }` |

### `POST /api/projects/delete`

| Field | Value |
|-------|-------|
| **Description** | Delete a project and unassign all its sessions |
| **Body** | `{ "project_id": string }` — **required** |
| **Response** | `{ "ok": true }` |

---

## Approvals

### `GET /api/approval/pending`

| Field | Value |
|-------|-------|
| **Description** | Check for a pending tool-execution approval for a session |
| **Query Params** | `session_id` (string) |
| **Response** | `{ "pending": { "approval_id": string, "command": string, "pattern_key": string, "description": string, ... }\|null, "pending_count": int }` |

### `POST /api/approval/respond`

| Field | Value |
|-------|-------|
| **Description** | Respond to a pending approval |
| **Body** | `{ "session_id": string, "choice": "once"\|"session"\|"always"\|"deny", "approval_id"?: string }` — `session_id` **required** |
| **Response** | `{ "ok": true, "choice": string }` |

### `GET /api/approval/inject_test`

| Field | Value |
|-------|-------|
| **Description** | **(Loopback-only, test use)** Inject a fake pending approval |
| **Query Params** | `session_id` (string, **required**); `pattern_key` (string, default `"test_pattern"`); `command` (string, default `"rm -rf /tmp/test"`) |
| **Response** | `{ "ok": true, "session_id": string }` |

---

## Clarify Prompts

### `GET /api/clarify/pending`

| Field | Value |
|-------|-------|
| **Description** | Check for a pending clarification prompt for a session |
| **Query Params** | `session_id` (string) |
| **Response** | `{ "pending": { "question": string, "choices_offered": [...], ... }\|null }` |

### `POST /api/clarify/respond`

| Field | Value |
|-------|-------|
| **Description** | Respond to a pending clarification prompt |
| **Body** | `{ "session_id": string, "response"\|"answer"\|"choice": string }` — `session_id` and one of `response`/`answer`/`choice` **required** |
| **Response** | `{ "ok": true, "response": string }` |

### `GET /api/clarify/inject_test`

| Field | Value |
|-------|-------|
| **Description** | **(Loopback-only, test use)** Inject a fake pending clarification |
| **Query Params** | `session_id` (string, **required**); `question` (string, default `"Which option?"`); `choices` (string[], optional) |
| **Response** | `{ "ok": true, "session_id": string }` |

---

## Updates

### `GET /api/updates/check`

| Field | Value |
|-------|-------|
| **Description** | Check for available updates (webui and agent). Can be disabled via settings. |
| **Query Params** | `force` (string, optional) — `"1"` to force fresh check; `simulate` (string, optional) — `"1"` for fake data (localhost only) |
| **Response** | `{ "webui": { "name": string, "behind": int, "current_sha": string, "latest_sha": string, "branch": string }, "agent": { ... }, "checked_at": float }` |
| **Response (disabled)** | `{ "disabled": true }` |

### `POST /api/updates/apply`

| Field | Value |
|-------|-------|
| **Description** | Apply a git-pull update to webui or agent |
| **Body** | `{ "target": "webui"\|"agent" }` — **required** |
| **Response** | `{ ...update result }` |

---

## Upload / Transcribe

### `POST /api/upload`

| Field | Value |
|-------|-------|
| **Description** | Upload a file to a session's workspace via multipart form data |
| **Content-Type** | `multipart/form-data` |
| **Fields** | `session_id` (form field, **required**); `file` (file field, **required**) |
| **Max Size** | Configured via `MAX_UPLOAD_BYTES` (default 20MB) |
| **Response (200)** | `{ "filename": string, "path": string, "size": int }` |
| **Response (413)** | `{ "error": "File too large (max NMB)" }` |

### `POST /api/transcribe`

| Field | Value |
|-------|-------|
| **Description** | Transcribe an audio file (voice input) to text via speech-to-text |
| **Content-Type** | `multipart/form-data` |
| **Fields** | `file` (file field, **required**) — audio file (e.g. `.webm`) |
| **Max Size** | Configured via `MAX_UPLOAD_BYTES` |
| **Response (200)** | `{ "ok": true, "transcript": string }` |
| **Response (503)** | `{ "error": "Speech-to-text is unavailable on this server" }` |

---

## Personalities

### `GET /api/personalities`

| Field | Value |
|-------|-------|
| **Description** | List agent personalities from `config.yaml` `agent.personalities` section |
| **Params** | None |
| **Response** | `{ "personalities": [ { "name": string, "description": string }, ... ] }` |

### `POST /api/personality/set`

| Field | Value |
|-------|-------|
| **Description** | Set the active personality for a session |
| **Body** | `{ "session_id": string, "name": string }` — both **required** (empty `name` clears personality) |
| **Response** | `{ "ok": true, "personality": string\|null, "prompt": string }` |

---

## Git Info

### `GET /api/git-info`

| Field | Value |
|-------|-------|
| **Description** | Get git branch/status info for a session's workspace |
| **Query Params** | `session_id` (string, **required**) |
| **Response** | `{ "git": { "branch": string, "is_repo": bool, ... } }` |

---

## Common Error Responses

All endpoints may return:

| Status | Body | Condition |
|--------|------|-----------|
| `400` | `{ "error": "description" }` | Invalid or missing parameters |
| `403` | `{ "error": "Cross-origin request rejected" }` | CSRF check failed (POST only) |
| `404` | `{ "error": "not found" }` | Unknown route |
| `500` | `{ "error": "Internal server error" }` | Unhandled exception |

---

## SessionCompact Schema

The `SessionCompact` object returned by most session endpoints:

```json
{
  "session_id": "string",
  "title": "string",
  "workspace": "string",
  "model": "string",
  "message_count": 0,
  "created_at": 1234567890.0,
  "updated_at": 1234567890.0,
  "pinned": false,
  "archived": false,
  "project_id": "string | null",
  "profile": "string | null"
}
```

---

*Total endpoints: 64 (26 GET + 38 POST)*
