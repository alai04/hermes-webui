# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Starting the Server
```bash
./start.sh
```
- Automatically discovers Hermes agent directory, Python executable, and state directory
- Defaults to port 8787 on localhost
- Prints URL and SSH tunnel command for remote access

### Manual Launch
```bash
cd /path/to/hermes-agent  # or wherever Hermes modules can be found
HERMES_WEBUI_PORT=8787 venv/bin/python /path/to/hermes-webui/server.py
```

### Running Tests
```bash
# From project root
pytest tests/ -v --timeout=60

# Using Hermes agent venv explicitly
/path/to/hermes-agent/venv/bin/python -m pytest tests/ -v
```
- Tests run against isolated server on port 8788 with separate state directory
- Production data and real cron jobs are never touched
- Current test count: 433 tests across 23 test files

### Environment Variables
Key overrides (usually auto-discovered):
- `HERMES_WEBUI_AGENT_DIR`: Path to hermes-agent checkout
- `HERMES_WEBUI_PYTHON`: Python executable path
- `HERMES_WEBUI_PORT`: Server port (default: 8787)
- `HERMES_WEBUI_STATE_DIR`: Sessions and state storage (default: `~/.hermes/webui-mvp`)
- `HERMES_WEBUI_DEFAULT_WORKSPACE`: Default workspace (default: `~/workspace`)
- `HERMES_WEBUI_PASSWORD`: Enable password authentication when set
- `HERMES_WEBUI_HOST`: Bind address (default: `127.0.0.1`)

### Docker Usage
```bash
# Pre-built image
docker run -d -p 8787:8787 -v ~/.hermes:/root/.hermes ghcr.io/nesquena/hermes-webui:latest

# Docker Compose (recommended)
docker compose up -d

# With password protection
docker run -d -p 8787:8787 -e HERMES_WEBUI_PASSWORD=your-secret -v ~/.hermes:/root/.hermes ghcr.io/nesquena/hermes-webui:latest
```

## Code Architecture

### High-Level Structure
```
server.py               HTTP routing shell + auth middleware (~83 lines)
api/
  auth.py               Optional password authentication, signed cookies (~149 lines)
  config.py             Discovery, globals, model detection, reloadable config (~726 lines)
  helpers.py            HTTP helpers, security headers (~71 lines)
  models.py             Session model + CRUD + CLI bridge (~338 lines)
  profiles.py           Profile state management, hermes_cli wrapper (~366 lines)
  routes.py             All GET + POST route handlers (~1314 lines)
  streaming.py          SSE engine, run_agent, cancel support (~332 lines)
  upload.py             Multipart parser, file upload handler (~78 lines)
  workspace.py          File ops, workspace helpers, git detection (~288 lines)
static/
  index.html            HTML template (~388 lines)
  style.css             All CSS incl. mobile responsive (~726 lines)
  ui.js                 DOM helpers, renderMd, tool cards, context indicator (~1063 lines)
  workspace.js          File preview, file ops, git badge (~247 lines)
  sessions.js           Session CRUD, collapsible groups, search (~589 lines)
  messages.js           send(), SSE handlers, rAF throttle (~352 lines)
  panels.js             Cron, skills, memory, profiles, settings (~1146 lines)
  commands.js           Slash command autocomplete (~170 lines)
  boot.js               Mobile nav, voice input, boot IIFE (~338 lines)
tests/
  conftest.py           Isolated test server (port 8788)
  test_sprint{1-23}.py  22 test files, 426 test functions
  test_regressions.py   Permanent regression gate (23 tests)
```

### Key Design Principles
- **Minimal Python dependencies**: Only requires `pyyaml`; all heavy ML/agent dependencies live in the Hermes agent venv
- **Zero build step**: Pure Python backend with vanilla HTML/CSS/JS frontend
- **Three-panel layout**: Left sidebar (sessions/tools), center (chat), right (workspace file browser)
- **State isolation**: Sessions, workspaces, and settings stored outside repo in `~/.hermes/webui-mvp/` by default
- **Security-first**: Optional password auth, signed HMAC cookies, security headers, 20MB POST limit
- **Extensible**: Profile system, themes, slash commands, skills system, memory persistence

### Core Responsibilities by Module
- **server.py**: HTTP server setup, TLS support, startup config, Hermes dependency verification
- **api/config.py**: Environment discovery, global constants, configuration reloading
- **api/routes.py**: HTTP request routing and handling (GET/POST)
- **api/streaming.py**: Server-Sent Events for real-time communication
- **api/models.py**: Session data model, CRUD operations, CLI session bridging
- **api/profiles.py**: Agent profile management (create, switch, delete)
- **api/workspace.js**: File browser functionality, git integration, file operations
- **static/ui.js**: DOM manipulation, message rendering, tool call visualization
- **static/panels.js**: Sidebar panels (Tasks, Skills, Memory, Profiles, Settings)

### Important Notes
- The server acts as a thin routing layer; all business logic resides in the Hermes agent
- Web UI provides interface to existing Hermes agent functionality without duplicating logic
- Frontend uses vanilla JavaScript with no build tools or frameworks
- Responsive design works on mobile (hamburger sidebar, bottom navigation)
- Theme system supports 6 built-in themes plus custom CSS theme definitions