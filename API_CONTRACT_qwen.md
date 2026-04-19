# Hermes Web UI -- API Contract

Base URL: `http://<host>:8787`

All API responses are JSON unless otherwise noted. Static files and media return their native MIME types.

---

## Overview

| Module | GET | POST | Description |
|--------|:---:|:----:|-------------|
| Authentication | 1 | 2 | Login, logout, auth status check |
| Session Management | 5 | 11 | CRUD, search, export, import, pin/archive |
| Chat | 3 | 2 | Streaming SSE + synchronous fallback |
| Models | 2 | 0 | Static catalog + live provider fetch |
| Settings | 1 | 1 | Read/write settings, including password |
| Onboarding | 1 | 2 | Onboarding status, setup, complete |
| Workspaces | 1 | 3 | Trusted workspace management |
| Projects | 1 | 3 | Project CRUD |
| Files | 3 | 5 | Directory listing, read/write, delete, rename |
| Cron / Skills / Memory | 7 | 9 | Scheduled jobs, skills, long-term memory |
| Profiles / Personalities | 2 | 4 | Multi-profile switching, personality settings |
| Approval / Clarify | 3 | 3 | Command approval, clarification prompts |
| Updates / Git / Misc | 2 | 1 | Version checks, Git info, health check |

---

## Table of Contents

- [Authentication](#authentication)
- [Pages / Views](#pages--views)
- [Session Management](#session-management)
- [Chat](#chat)
- [Models](#models)
- [Settings](#settings)
- [Onboarding](#onboarding)
- [Workspaces](#workspaces)
- [Projects](#projects)
- [Files](#files)
- [Media](#media)
- [Upload & Transcription](#upload--transcription)
- [Approval System](#approval-system)
- [Clarify System](#clarify-system)
- [Cron Jobs](#cron-jobs)
- [Skills](#skills)
- [Memory](#memory)
- [Profiles](#profiles)
- [Personalities](#personalities)
- [Git Info](#git-info)
- [Updates](#updates)
- [Miscellaneous](#miscellaneous)

---

## Authentication

### `POST /api/auth/login`

Authenticate with the Web UI password.

**Request body (JSON):**

| Field    | Type   | Required | Description       |
| -------- | ------ | -------- | ----------------- |
| password | string | Yes      | User password     |

**Returns (200):**

```json
{ "ok": true }
```

Sets an HTTP-only auth cookie. Returns `401` on invalid password, `429` on rate limit.

---

### `POST /api/auth/logout`

Clear the auth session.

**Returns (200):**

```json
{ "ok": true }
```

Clears the auth cookie.

---

### `GET /api/auth/status`

Check whether authentication is enabled and whether the current request is logged in.

**Returns:**

| Field        | Type    | Description                        |
| ------------ | ------- | ---------------------------------- |
| auth_enabled | boolean | Whether password auth is active    |
| logged_in    | boolean | Whether this request is authenticated |

---

## Pages / Views

### `GET /` / `GET /index.html`

Serve the main application page (`index.html`).

**Content-Type:** `text/html; charset=utf-8`

---

### `GET /login`

Serve the self-contained login page, localized per the `language` setting.

**Content-Type:** `text/html; charset=utf-8`

---

### `GET /favicon.ico`

Serve the site favicon. Returns `204` if the file doesn't exist.

**Content-Type:** `image/x-icon`
**Cache-Control:** `public, max-age=86400`

---

### `GET /static/*`

Serve static assets (CSS, JS, images, fonts) from the `static/` directory.

**Content-Type:** Auto-detected from file extension.
**Cache-Control:** `no-store`

---

## Session Management

### `GET /api/session?session_id=<sid>`

Retrieve a single session by ID. Works for both WebUI and CLI sessions.

**Query params:**

| Param      | Type   | Required | Description      |
| ---------- | ------ | -------- | ---------------- |
| session_id | string | Yes      | Session UUID/hex |

**Returns:**

| Field                   | Type    | Description                               |
| ----------------------- | ------- | ----------------------------------------- |
| session.session_id      | string  | Session ID                                |
| session.title           | string  | Session title                             |
| session.workspace       | string  | Workspace path                            |
| session.model           | string  | Model identifier                          |
| session.message_count   | number  | Number of messages                        |
| session.created_at      | number  | Unix timestamp                            |
| session.updated_at      | number  | Unix timestamp                            |
| session.pinned          | boolean | Whether pinned                            |
| session.archived        | boolean | Whether archived                          |
| session.project_id      | string? | Associated project ID or null             |
| session.profile         | string? | Profile name                              |
| session.personality     | string? | Personality name                          |
| session.is_cli_session  | boolean | True if imported from CLI                 |
| session.messages        | array   | Full message history                      |
| session.tool_calls      | array   | Tool call records                         |
| session.active_stream_id| string? | Currently active stream ID or null        |
| session.pending_user_message | string? | Pending message awaiting processing |
| session.pending_attachments  | array?  | Pending attachment paths              |
| session.pending_started_at   | number? | When pending message started        |

Returns `400` if `session_id` missing, `404` if not found.

---

### `GET /api/sessions`

List all sessions (WebUI + optionally CLI), sorted by `updated_at` descending.

**Returns:**

| Field     | Type   | Description                          |
| --------- | ------ | ------------------------------------ |
| sessions  | array  | Array of session summary objects     |
| cli_count | number | Number of CLI sessions included      |

---

### `GET /api/sessions/search`

Search sessions by title and/or message content.

**Query params:**

| Param   | Type   | Required | Description                           |
| ------- | ------ | -------- | ------------------------------------- |
| q       | string | No       | Search query (returns all if empty)   |
| content | string | No       | `"1"` to search message content (default), `"0"` title only |
| depth   | number | No       | Max messages to search per session (default `5`) |

**Returns:**

| Field    | Type   | Description                       |
| -------- | ------ | --------------------------------- |
| sessions | array  | Matching sessions with `match_type` (`"title"` or `"content"`) |
| query    | string | The search query                  |
| count    | number | Number of results                 |

---

### `POST /api/session/new`

Create a new session.

**Request body (JSON):**

| Field     | Type   | Required | Description                    |
| --------- | ------ | -------- | ------------------------------ |
| workspace | string | No       | Workspace path (uses default if omitted) |
| model     | string | No       | Model identifier (uses default if omitted) |

**Returns:**

| Field   | Type   | Description           |
| ------- | ------ | --------------------- |
| session | object | New session summary   |

---

### `POST /api/session/rename`

Rename a session.

**Request body (JSON):**

| Field      | Type   | Required | Description        |
| ---------- | ------ | -------- | ------------------ |
| session_id | string | Yes      | Session ID         |
| title      | string | Yes      | New title (max 80) |

**Returns:** `{ "session": <session summary> }`

---

### `POST /api/session/update`

Update session workspace and/or model.

**Request body (JSON):**

| Field      | Type   | Required | Description                    |
| ---------- | ------ | -------- | ------------------------------ |
| session_id | string | Yes      | Session ID                     |
| workspace  | string | No       | New workspace path             |
| model      | string | No       | New model identifier           |

**Returns:** `{ "session": <session summary with messages> }`

---

### `POST /api/session/delete`

Delete a session (from both WebUI store and CLI store).

**Request body (JSON):**

| Field      | Type   | Required | Description |
| ---------- | ------ | -------- | ----------- |
| session_id | string | Yes      | Session ID  |

**Returns:** `{ "ok": true }`

---

### `POST /api/session/clear`

Clear all messages from a session; resets title to "Untitled".

**Request body (JSON):**

| Field      | Type   | Required | Description |
| ---------- | ------ | -------- | ----------- |
| session_id | string | Yes      | Session ID  |

**Returns:** `{ "ok": true, "session": <session summary> }`

---

### `POST /api/session/truncate`

Truncate a session's messages, keeping only the first N.

**Request body (JSON):**

| Field      | Type   | Required | Description                |
| ---------- | ------ | -------- | -------------------------- |
| session_id | string | Yes      | Session ID                 |
| keep_count | number | Yes      | Number of messages to keep |

**Returns:** `{ "ok": true, "session": <session summary with messages> }`

---

### `GET /api/session/export?session_id=<sid>`

Export a session as a JSON file download.

**Query params:**

| Param      | Type   | Required | Description |
| ---------- | ------ | -------- | ----------- |
| session_id | string | Yes      | Session ID  |

**Returns:** JSON file attachment (`hermes-<sid>.json`).

---

### `POST /api/session/import`

Import a session from a JSON export. Creates a new session with a new ID.

**Request body (JSON):**

| Field      | Type   | Required | Description                    |
| ---------- | ------ | -------- | ------------------------------ |
| messages   | array  | Yes      | Array of message objects       |
| title      | string | No       | Session title (default: "Imported session") |
| workspace  | string | No       | Workspace path                 |
| model      | string | No       | Model identifier               |
| tool_calls | array  | No       | Tool call records              |
| pinned     | boolean| No       | Whether to pin the session     |

**Returns:** `{ "ok": true, "session": <new session> }`

---

### `POST /api/session/import_cli`

Import a CLI session into the WebUI store (idempotent).

**Request body (JSON):**

| Field      | Type   | Required | Description |
| ---------- | ------ | -------- | ----------- |
| session_id | string | Yes      | CLI session ID |

**Returns:**

```json
{
  "session": { ... },
  "imported": true  // false if already imported
}
```

---

### `POST /api/session/pin`

Pin or unpin a session.

**Request body (JSON):**

| Field      | Type    | Required | Description                   |
| ---------- | ------- | -------- | ----------------------------- |
| session_id | string  | Yes      | Session ID                    |
| pinned     | boolean | No       | Pin state (default `true`)    |

**Returns:** `{ "ok": true, "session": <session summary> }`

---

### `POST /api/session/archive`

Archive or un-archive a session.

**Request body (JSON):**

| Field      | Type    | Required | Description                     |
| ---------- | ------- | -------- | ------------------------------- |
| session_id | string  | Yes      | Session ID                      |
| archived   | boolean | No       | Archive state (default `true`)  |

**Returns:** `{ "ok": true, "session": <session summary> }`

---

### `POST /api/session/move`

Move a session to a project.

**Request body (JSON):**

| Field      | Type   | Required | Description                    |
| ---------- | ------ | -------- | ------------------------------ |
| session_id | string | Yes      | Session ID                     |
| project_id | string | No       | Target project ID (null to unassign) |

**Returns:** `{ "ok": true, "session": <session summary> }`

---

### `POST /api/sessions/cleanup`

Delete untitled sessions with zero messages.

**Request body (JSON):** No body required.

**Returns:** `{ "ok": true, "cleaned": <count> }`

---

### `POST /api/sessions/cleanup_zero_message`

Same as above -- explicit zero-message-only cleanup.

**Returns:** `{ "ok": true, "cleaned": <count> }`

---

### `GET /api/sessions/gateway/stream`

SSE stream for real-time CLI (agent) session updates. Requires `show_cli_sessions` setting to be enabled.

**Events:** `sessions_changed` (with `{sessions: [...]}` data).

**Content-Type:** `text/event-stream`

Returns `404` if agent sessions not enabled, `503` if watcher not started.

---

## Chat

### `POST /api/chat/start`

Start a streaming chat in the given session. Creates a background agent thread and returns a `stream_id` for SSE polling.

**Request body (JSON):**

| Field       | Type   | Required | Description                    |
| ----------- | ------ | -------- | ------------------------------ |
| session_id  | string | Yes      | Session ID                     |
| message     | string | Yes      | User message text              |
| attachments | array  | No       | Array of file paths (max 20)   |
| workspace   | string | No       | Workspace override             |
| model       | string | No       | Model override                 |

**Returns:**

```json
{ "stream_id": "<hex>", "session_id": "<sid>" }
```

Returns `409` if the session already has an active stream.

---

### `GET /api/chat/stream?stream_id=<id>`

Server-Sent Events endpoint. Connect to receive real-time chat events for a given stream.

**Query params:**

| Param      | Type   | Required | Description |
| ---------- | ------ | -------- | ----------- |
| stream_id  | string | Yes      | Stream ID from `/api/chat/start` |

**Events:** `message`, `done`, `error`, `cancel`, `stream_end`, `tool_use`, `approval`, `clarify`, etc.

**Content-Type:** `text/event-stream`

---

### `GET /api/chat/stream/status?stream_id=<id>`

Check if a stream is still active.

**Query params:**

| Param     | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| stream_id | string | Yes      | Stream ID   |

**Returns:** `{ "active": boolean, "stream_id": "<id>" }`

---

### `GET /api/chat/cancel?stream_id=<id>`

Request cancellation of a running stream.

**Query params:**

| Param     | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| stream_id | string | Yes      | Stream ID   |

**Returns:** `{ "ok": true, "cancelled": boolean, "stream_id": "<id>" }`

---

### `POST /api/chat`

Synchronous (blocking) chat fallback. Runs a full conversation in a single request/response.

**Request body (JSON):**

| Field       | Type   | Required | Description           |
| ----------- | ------ | -------- | --------------------- |
| session_id  | string | Yes      | Session ID            |
| message     | string | Yes      | User message text     |
| attachments | array  | No       | File paths (max 20)   |
| workspace   | string | No       | Workspace override    |
| model       | string | No       | Model override        |

**Returns:**

| Field    | Type   | Description                     |
| -------- | ------ | ------------------------------- |
| answer   | string | Agent's final response          |
| status   | string | `"done"` or `"partial"`         |
| session  | object | Updated session summary         |
| result   | object | Additional result metadata      |

---

## Models

### `GET /api/models`

Return the configured model list from `config.yaml` (static catalog).

**Returns:** `{ "models": [ { "id", "label", "provider" }, ... ] }`

---

### `GET /api/models/live?provider=<provider>`

Return live model list for a given provider, fetched from provider APIs (OpenRouter, Anthropic, Copilot, etc.). Falls back to static catalog if live fetch fails.

**Query params:**

| Param    | Type   | Required | Description                              |
| -------- | ------ | -------- | ---------------------------------------- |
| provider | string | No       | Provider ID; defaults to active profile  |

**Returns:**

```json
{
  "provider": "<provider>",
  "models": [ { "id": "...", "label": "..." }, ... ],
  "count": <number>
}
```

---

## Settings

### `GET /api/settings`

Get current Web UI settings. The `password_hash` field is always stripped from the response.

**Returns:** Settings object (JSON) with fields like `bot_name`, `language`, `show_cli_sessions`, `sync_to_insights`, `check_for_updates`, etc.

---

### `POST /api/settings`

Update settings. Optionally sets password and re-authenticates if auth is newly enabled.

**Request body (JSON):** Any settings field. Special fields:

| Field          | Type    | Description                              |
| -------------- | ------- | ---------------------------------------- |
| bot_name       | string  | Bot display name                         |
| _set_password  | string  | Set a new password (triggers auth enablement) |

**Returns:** Settings object plus:

| Field            | Type    | Description                          |
| ---------------- | ------- | ------------------------------------ |
| auth_enabled     | boolean | Whether auth is now active           |
| logged_in        | boolean | Whether the current session is logged in |
| auth_just_enabled| boolean | Whether auth was just enabled now    |

If auth was just enabled and the client was not logged in, a new auth cookie is set.

---

## Onboarding

### `GET /api/onboarding/status`

Check whether onboarding is complete.

**Returns:**

```json
{ "completed": boolean }
```

---

### `POST /api/onboarding/setup`

Apply onboarding configuration (writes API keys to disk).

**Request body (JSON):** Onboarding configuration fields (provider keys, etc.).

**Returns:** `{ "ok": true, ... }` or error details.

**Security:** Only available from local/private networks when auth is disabled, or when `HERMES_WEBUI_ONBOARDING_OPEN=1` is set.

---

### `POST /api/onboarding/complete`

Mark onboarding as complete.

**Returns:** `{ "ok": true }`

---

## Workspaces

### `GET /api/workspaces`

List trusted workspaces and the last-used workspace.

**Returns:**

```json
{ "workspaces": [ { "path": "...", "name": "..." }, ... ], "last": "..." }
```

---

### `POST /api/workspaces/add`

Add a workspace to the trusted list.

**Request body (JSON):**

| Field | Type   | Required | Description              |
| ----- | ------ | -------- | ------------------------ |
| path  | string | Yes      | Absolute workspace path  |
| name  | string | No       | Display name (defaults to dir name) |

**Returns:** `{ "ok": true, "workspaces": [...] }`

---

### `POST /api/workspaces/remove`

Remove a workspace from the trusted list.

**Request body (JSON):**

| Field | Type   | Required | Description            |
| ----- | ------ | -------- | ---------------------- |
| path  | string | Yes      | Workspace path to remove |

**Returns:** `{ "ok": true, "workspaces": [...] }`

---

### `POST /api/workspaces/rename`

Rename a workspace in the trusted list.

**Request body (JSON):**

| Field | Type   | Required | Description            |
| ----- | ------ | -------- | ---------------------- |
| path  | string | Yes      | Current workspace path |
| name  | string | Yes      | New display name       |

**Returns:** `{ "ok": true, "workspaces": [...] }`

---

## Projects

### `GET /api/projects`

List all projects.

**Returns:** `{ "projects": [ { "project_id", "name", "color", "created_at" }, ... ] }`

---

### `POST /api/projects/create`

Create a new project.

**Request body (JSON):**

| Field | Type   | Required | Description               |
| ----- | ------ | -------- | ------------------------- |
| name  | string | Yes      | Project name (max 128)    |
| color | string | No       | Hex color (e.g. `#ff0000`) |

**Returns:** `{ "ok": true, "project": { ... } }`

---

### `POST /api/projects/rename`

Rename a project (and optionally change its color).

**Request body (JSON):**

| Field      | Type   | Required | Description           |
| ---------- | ------ | -------- | --------------------- |
| project_id | string | Yes      | Project ID            |
| name       | string | Yes      | New name (max 128)    |
| color      | string | No       | New hex color         |

**Returns:** `{ "ok": true, "project": { ... } }`

---

### `POST /api/projects/delete`

Delete a project. Unlinks all sessions from the deleted project.

**Request body (JSON):**

| Field      | Type   | Required | Description |
| ---------- | ------ | -------- | ----------- |
| project_id | string | Yes      | Project ID  |

**Returns:** `{ "ok": true }`

---

## Files

### `GET /api/list?session_id=<sid>&path=<path>`

List directory contents in the session's workspace.

**Query params:**

| Param      | Type   | Required | Description                          |
| ---------- | ------ | -------- | ------------------------------------ |
| session_id | string | Yes      | Session ID                           |
| path       | string | No       | Relative path within workspace (default `.`) |

**Returns:**

```json
{ "entries": [ { "name", "type", "size", "mtime" }, ... ], "path": "..." }
```

---

### `GET /api/file?session_id=<sid>&path=<path>`

Read a file's content with metadata.

**Query params:**

| Param      | Type   | Required | Description                 |
| ---------- | ------ | -------- | --------------------------- |
| session_id | string | Yes      | Session ID                  |
| path       | string | Yes      | Relative file path          |

**Returns:** `{ "content": "...", "path": "...", "size": <bytes>, "mime": "..." }`

---

### `GET /api/file/raw?session_id=<sid>&path=<path>&download=1`

Serve a file's raw bytes. Forces download for dangerous MIME types.

**Query params:**

| Param      | Type   | Required | Description                        |
| ---------- | ------ | -------- | ---------------------------------- |
| session_id | string | Yes      | Session ID                         |
| path       | string | Yes      | Relative file path                 |
| download   | string | No       | `"1"` to force download            |

**Content-Type:** Auto-detected from extension.

---

### `POST /api/file/delete`

Delete a file in the workspace.

**Request body (JSON):**

| Field      | Type   | Required | Description       |
| ---------- | ------ | -------- | ----------------- |
| session_id | string | Yes      | Session ID        |
| path       | string | Yes      | Relative file path |

**Returns:** `{ "ok": true, "path": "..." }`

---

### `POST /api/file/save`

Overwrite an existing file's content.

**Request body (JSON):**

| Field      | Type   | Required | Description       |
| ---------- | ------ | -------- | ----------------- |
| session_id | string | Yes      | Session ID        |
| path       | string | Yes      | Relative file path |
| content    | string | No       | New content (default empty) |

**Returns:** `{ "ok": true, "path": "...", "size": <bytes> }`

---

### `POST /api/file/create`

Create a new file (fails if it already exists).

**Request body (JSON):**

| Field      | Type   | Required | Description       |
| ---------- | ------ | -------- | ----------------- |
| session_id | string | Yes      | Session ID        |
| path       | string | Yes      | Relative file path |
| content    | string | No       | File content      |

**Returns:** `{ "ok": true, "path": "..." }`

---

### `POST /api/file/rename`

Rename a file.

**Request body (JSON):**

| Field      | Type   | Required | Description              |
| ---------- | ------ | -------- | ------------------------ |
| session_id | string | Yes      | Session ID               |
| path       | string | Yes      | Current relative path    |
| new_name   | string | Yes      | New filename (no slashes, no `..`) |

**Returns:** `{ "ok": true, "old_path": "...", "new_path": "..." }`

---

### `POST /api/file/create-dir`

Create a directory (with parents if needed).

**Request body (JSON):**

| Field      | Type   | Required | Description              |
| ---------- | ------ | -------- | ------------------------ |
| session_id | string | Yes      | Session ID               |
| path       | string | Yes      | Relative directory path  |

**Returns:** `{ "ok": true, "path": "..." }`

---

## Media

### `GET /api/media?path=<abs_path>`

Serve a local file by absolute path for inline display (primarily images in chat).

**Query params:**

| Param | Type   | Required | Description          |
| ----- | ------ | -------- | -------------------- |
| path  | string | Yes      | Absolute file path   |

**Security:**
- Auth-gated when auth is enabled
- Path must resolve to allowed roots (hermes home, `/tmp`, active workspace)
- Only image MIME types served inline; others force download
- SVG always served as attachment (XSS risk)

**Returns:** Raw file bytes with appropriate `Content-Type` and `Content-Disposition` headers.

---

## Upload & Transcription

### `POST /api/upload`

Upload a file to a session's workspace (multipart/form-data).

**Form fields:**

| Field      | Type | Required | Description           |
| ---------- | ---- | -------- | --------------------- |
| session_id | str  | Yes      | Session ID            |
| file       | file | Yes      | File to upload        |

**Returns:** `{ "filename": "...", "path": "...", "size": <bytes> }`

Returns `413` if file exceeds `MAX_UPLOAD_BYTES`.

---

### `POST /api/transcribe`

Transcribe an audio file (speech-to-text).

**Form fields:**

| Field | Type | Required | Description         |
| ----- | ---- | -------- | ------------------- |
| file  | file | Yes      | Audio file to transcribe |

**Returns:** `{ "ok": true, "transcript": "..." }`

Returns `503` if STT is unavailable, `400` on transcription error.

---

## Approval System

### `GET /api/approval/pending?session_id=<sid>`

Poll for pending command approvals.

**Query params:**

| Param      | Type   | Required | Description |
| ---------- | ------ | -------- | ----------- |
| session_id | string | Yes      | Session ID  |

**Returns:**

```json
{
  "pending": { "command": "...", "pattern_key": "...", "pattern_keys": [...], "description": "...", "approval_id": "..." } | null,
  "pending_count": <number>
}
```

---

### `POST /api/approval/respond`

Respond to a pending approval (approve/deny).

**Request body (JSON):**

| Field       | Type   | Required | Description                                 |
| ----------- | ------ | -------- | ------------------------------------------- |
| session_id  | string | Yes      | Session ID                                  |
| choice      | string | No       | `"once"`, `"session"`, `"always"`, or `"deny"` (default `"deny"`) |
| approval_id | string | No       | Target a specific approval (fallback: oldest) |

**Returns:** `{ "ok": true, "choice": "<choice>" }`

---

### `GET /api/approval/inject_test?session_id=<sid>&pattern_key=<key>&command=<cmd>`

Inject a fake pending approval for automated testing. **Loopback only (127.0.0.1).**

**Returns:** `{ "ok": true, "session_id": "..." }`

---

## Clarify System

### `GET /api/clarify/pending?session_id=<sid>`

Poll for pending clarification prompts from the agent.

**Query params:**

| Param      | Type   | Required | Description |
| ---------- | ------ | -------- | ----------- |
| session_id | string | Yes      | Session ID  |

**Returns:** `{ "pending": { "question": "...", "choices_offered": [...], ... } | null }`

---

### `POST /api/clarify/respond`

Respond to a pending clarify prompt.

**Request body (JSON):**

| Field      | Type   | Required | Description                          |
| ---------- | ------ | -------- | ------------------------------------ |
| session_id | string | Yes      | Session ID                           |
| response   | string | Yes      | User's answer (also accepts `answer` or `choice`) |

**Returns:** `{ "ok": true, "response": "..." }`

---

### `GET /api/clarify/inject_test?session_id=<sid>&question=<q>&choices=<c>`

Inject a fake pending clarify prompt for testing. **Loopback only (127.0.0.1).**

**Returns:** `{ "ok": true, "session_id": "..." }`

---

## Cron Jobs

### `GET /api/crons`

List all cron jobs (including disabled).

**Returns:** `{ "jobs": [ { "id", "name", "prompt", "schedule", "deliver", "skills", "model", "enabled", "last_run_at", "last_status", ... }, ... ] }`

---

### `GET /api/crons/output?job_id=<id>&limit=<n>`

Retrieve recent output for a cron job.

**Query params:**

| Param   | Type   | Required | Description                     |
| ------- | ------ | -------- | ------------------------------- |
| job_id  | string | Yes      | Cron job ID                     |
| limit   | number | No       | Max number of output files (default `5`) |

**Returns:** `{ "job_id": "...", "outputs": [ { "filename": "...", "content": "..." }, ... ] }`

---

### `GET /api/crons/recent?since=<timestamp>`

Get cron job completions since a given Unix timestamp.

**Query params:**

| Param | Type   | Required | Description                |
| ----- | ------ | -------- | -------------------------- |
| since | number | No       | Unix timestamp (default `0`) |

**Returns:**

```json
{
  "completions": [
    { "job_id": "...", "name": "...", "status": "...", "completed_at": <timestamp> }
  ],
  "since": <timestamp>
}
```

---

### `POST /api/crons/create`

Create a new cron job.

**Request body (JSON):**

| Field    | Type   | Required | Description                              |
| -------- | ------ | -------- | ---------------------------------------- |
| prompt   | string | Yes      | Task prompt                              |
| schedule | string | Yes      | Cron schedule expression (e.g. `"0 9 * * *"`) |
| name     | string | No       | Job display name                         |
| deliver  | string | No       | Delivery mode (`"local"`, etc.)          |
| skills   | array  | No       | Skill names to enable for this job       |
| model    | string | No       | Model override                          |

**Returns:** `{ "ok": true, "job": { ... } }`

---

### `POST /api/crons/update`

Update an existing cron job.

**Request body (JSON):**

| Field  | Type   | Required | Description        |
| ------ | ------ | -------- | ------------------ |
| job_id | string | Yes      | Job ID             |
| ...    | any    | No       | Fields to update   |

**Returns:** `{ "ok": true, "job": { ... } }` or `404` if not found.

---

### `POST /api/crons/delete`

Delete a cron job.

**Request body (JSON):**

| Field  | Type   | Required | Description |
| ------ | ------ | -------- | ----------- |
| job_id | string | Yes      | Job ID      |

**Returns:** `{ "ok": true, "job_id": "..." }` or `404` if not found.

---

### `POST /api/crons/run`

Trigger an immediate manual run of a cron job.

**Request body (JSON):**

| Field  | Type   | Required | Description |
| ------ | ------ | -------- | ----------- |
| job_id | string | Yes      | Job ID      |

**Returns:** `{ "ok": true, "job_id": "...", "status": "triggered" }`

---

### `POST /api/crons/pause`

Pause a cron job.

**Request body (JSON):**

| Field  | Type   | Required | Description           |
| ------ | ------ | -------- | --------------------- |
| job_id | string | Yes      | Job ID                |
| reason | string | No       | Pause reason (optional) |

**Returns:** `{ "ok": true, "job": { ... } }` or `404` if not found.

---

### `POST /api/crons/resume`

Resume a paused cron job.

**Request body (JSON):**

| Field  | Type   | Required | Description |
| ------ | ------ | -------- | ----------- |
| job_id | string | Yes      | Job ID      |

**Returns:** `{ "ok": true, "job": { ... } }` or `404` if not found.

---

## Skills

### `GET /api/skills`

List all available skills.

**Returns:** `{ "skills": [ { "name", "description", "category" }, ... ] }`

---

### `GET /api/skills/content?name=<name>&file=<file>`

Get a skill's content (SKILL.md) and linked files.

**Query params:**

| Param | Type   | Required | Description                        |
| ----- | ------ | -------- | ---------------------------------- |
| name  | string | Yes      | Skill name                         |
| file  | string | No       | Specific linked file to serve from skill dir |

**Returns:**

```json
{ "content": "...", "description": "...", "linked_files": { ... } }
```

If `file` is specified, returns `{ "content": "...", "path": "<file>" }` for that file.

---

### `POST /api/skills/save`

Create or update a skill.

**Request body (JSON):**

| Field    | Type   | Required | Description              |
| -------- | ------ | -------- | ------------------------ |
| name     | string | Yes      | Skill name               |
| content  | string | Yes      | SKILL.md content         |
| category | string | No       | Category subdirectory    |

**Returns:** `{ "ok": true, "name": "...", "path": "..." }`

---

### `POST /api/skills/delete`

Delete a skill.

**Request body (JSON):**

| Field | Type   | Required | Description |
| ----- | ------ | -------- | ----------- |
| name  | string | Yes      | Skill name  |

**Returns:** `{ "ok": true, "name": "..." }` or `404` if not found.

---

## Memory

### `GET /api/memory`

Read MEMORY.md and USER.md from the active profile's memories directory.

**Returns:**

| Field        | Type    | Description                        |
| ------------ | ------- | ---------------------------------- |
| memory       | string  | Content of MEMORY.md (redacted)    |
| user         | string  | Content of USER.md (redacted)      |
| memory_path  | string  | Absolute path to MEMORY.md         |
| user_path    | string  | Absolute path to USER.md           |
| memory_mtime | number? | Last modified timestamp            |
| user_mtime   | number? | Last modified timestamp            |

---

### `POST /api/memory/write`

Write to MEMORY.md or USER.md.

**Request body (JSON):**

| Field   | Type   | Required | Description                        |
| ------- | ------ | -------- | ---------------------------------- |
| section | string | Yes      | `"memory"` (MEMORY.md) or `"user"` (USER.md) |
| content | string | Yes      | New file content                   |

**Returns:** `{ "ok": true, "section": "...", "path": "..." }`

---

## Profiles

### `GET /api/profiles`

List all profiles and the currently active one.

**Returns:**

```json
{ "profiles": [ { "name", "path", ... }, ... ], "active": "<name>" }
```

---

### `GET /api/profile/active`

Get the active profile name and Hermes home path.

**Returns:** `{ "name": "...", "path": "..." }`

---

### `POST /api/profile/switch`

Switch to a different profile.

**Request body (JSON):**

| Field | Type   | Required | Description    |
| ----- | ------ | -------- | -------------- |
| name  | string | Yes      | Profile name   |

**Returns:** Profile switch result object. Returns `404` if profile not found, `409` on conflict.

---

### `POST /api/profile/create`

Create a new profile.

**Request body (JSON):**

| Field        | Type    | Required | Description                                      |
| ------------ | ------- | -------- | ------------------------------------------------ |
| name         | string  | Yes      | Profile name (lowercase, numbers, hyphens, underscores; 1-64 chars) |
| clone_from   | string  | No       | Clone settings from an existing profile           |
| clone_config | boolean | No       | Also clone config when `clone_from` is specified  |
| base_url     | string  | No       | Custom API base URL (must start with http:// or https://) |
| api_key      | string  | No       | API key for this profile                          |

**Returns:** `{ "ok": true, "profile": { ... } }`

---

### `POST /api/profile/delete`

Delete a profile.

**Request body (JSON):**

| Field | Type   | Required | Description  |
| ----- | ------ | -------- | ------------ |
| name  | string | Yes      | Profile name |

**Returns:** Profile delete result. Returns `409` on conflict (e.g. deleting active profile).

---

## Personalities

### `GET /api/personalities`

List agent personalities from `config.yaml` `agent.personalities` section.

**Returns:**

```json
{ "personalities": [ { "name": "...", "description": "..." }, ... ] }
```

---

### `POST /api/personality/set`

Set the personality for a session.

**Request body (JSON):**

| Field      | Type   | Required | Description                    |
| ---------- | ------ | -------- | ------------------------------ |
| session_id | string | Yes      | Session ID                     |
| name       | string | Yes      | Personality name (empty string to clear) |

**Returns:** `{ "ok": true, "personality": "...", "prompt": "..." }` or `404` if personality not found.

---

## Git Info

### `GET /api/git-info?session_id=<sid>`

Get Git repository info (branch, commit, status) for the session's workspace.

**Query params:**

| Param      | Type   | Required | Description |
| ---------- | ------ | -------- | ----------- |
| session_id | string | Yes      | Session ID  |

**Returns:** `{ "git": { "branch", "commit", "status", ... } }`

---

## Updates

### `GET /api/updates/check?force=1&simulate=1`

Check for available updates of the WebUI and/or agent.

**Query params:**

| Param     | Type   | Required | Description                                    |
| --------- | ------ | -------- | ---------------------------------------------- |
| force     | string | No       | `"1"` to bypass cache                            |
| simulate  | string | No       | `"1"` to return fake behind counts (localhost only, for UI testing) |

**Returns:**

```json
{
  "webui": { "name": "webui", "behind": <n>, "current_sha": "...", "latest_sha": "...", "branch": "..." },
  "agent": { "name": "agent", "behind": <n>, "current_sha": "...", "latest_sha": "...", "branch": "..." },
  "checked_at": <timestamp>
}
```

Returns `{ "disabled": true }` if `check_for_updates` setting is false.

---

### `POST /api/updates/apply`

Apply a pending update.

**Request body (JSON):**

| Field  | Type   | Required | Description              |
| ------ | ------ | -------- | ------------------------ |
| target | string | Yes      | `"webui"` or `"agent"`   |

**Returns:** Update result object.

---

## Miscellaneous

### `GET /health`

Health check endpoint.

**Returns:**

| Field            | Type    | Description                  |
| ---------------- | ------- | ---------------------------- |
| status           | string  | Always `"ok"`                |
| sessions         | number  | Number of active sessions    |
| active_streams   | number  | Number of active SSE streams |
| uptime_seconds   | number  | Server uptime                |

---

## Error Response Format

All error responses follow this format:

```json
{ "error": "Human-readable error message" }
```

Common HTTP status codes:

| Status | Meaning                           |
| ------ | --------------------------------- |
| 400    | Bad request (missing params)      |
| 401    | Unauthorized (invalid password)   |
| 403    | Forbidden (CSRF / path traversal) |
| 404    | Not found                         |
| 409    | Conflict (stream already active)  |
| 413    | Payload too large (upload limit)  |
| 429    | Too many requests (rate limit)    |
| 500    | Internal server error             |
| 503    | Service unavailable               |

---

## Security Notes

- **CSRF:** All POST requests validate `Origin`/`Referer` against the `Host` header and `HERMES_WEBUI_ALLOWED_ORIGINS` env var. Cross-origin browser requests are rejected with `403`.
- **Path traversal:** File paths are sandboxed to the session workspace or allowed roots. `..` components and symlinks are validated.
- **Session IDs:** Must match `[0-9a-z_]+` character set.
- **Auth cookie:** HTTP-only, `SameSite=Lax`, `Secure` (when behind HTTPS proxy).
- **Approval/Clarify test injection:** Endpoints `/api/approval/inject_test` and `/api/clarify/inject_test` are restricted to `127.0.0.1` only.
