"""Behavioral coverage for extension turn-lifecycle subscriptions."""

import json
from pathlib import Path
import shutil
import subprocess
import textwrap

import pytest


ROOT = Path(__file__).parent.parent
EXTENSION_SETTINGS_JS = ROOT / "static" / "extension_settings.js"
MESSAGES_JS = (ROOT / "static" / "messages.js").read_text(encoding="utf-8")


def _function_body(source: str, name: str) -> str:
    start = source.index(f"function {name}")
    brace = source.index("){", start) + 1
    depth = 0
    for index in range(brace, len(source)):
        if source[index] == "{":
            depth += 1
        elif source[index] == "}":
            depth -= 1
            if depth == 0:
                return source[start : index + 1]
    raise AssertionError(f"function {name} body not found")


def _event_listener_body(source: str, event_name: str) -> str:
    start = source.index(f"source.addEventListener('{event_name}'")
    brace = source.index("{", start)
    depth = 0
    for index in range(brace, len(source)):
        if source[index] == "{":
            depth += 1
        elif source[index] == "}":
            depth -= 1
            if depth == 0:
                return source[start : index + 1]
    raise AssertionError(f"event listener {event_name!r} body not found")


def _run_node(script: str):
    node = shutil.which("node")
    if not node:
        pytest.skip("node is required for extension lifecycle runtime tests")
    result = subprocess.run(
        [node, "-e", script],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=20,
    )
    assert result.returncode == 0, result.stderr + result.stdout


def test_registered_extension_receives_bounded_turn_lifecycle_events():
    script = textwrap.dedent(
        f"""
        const fs = require('fs');
        const assert = require('assert');
        const store = new Map();
        const loggedErrors = [];
        global.window = {{
          __HERMES_EXTENSION_CONFIG__: {{
            extensions: [
              {{id: 'alpha.ext', storage_owned: false}},
              {{id: 'beta.ext', storage_owned: false}},
            ],
          }},
          localStorage: {{
            getItem(key) {{ return store.has(key) ? store.get(key) : null; }},
            setItem(key, value) {{ store.set(key, String(value)); }},
            removeItem(key) {{ store.delete(key); }},
          }},
        }};
        global.console = {{
          error(...args) {{ loggedErrors.push(args.map(String).join(' ')); }},
        }};
        eval(fs.readFileSync({str(EXTENSION_SETTINGS_JS)!r}, 'utf8'));

        const alpha = window.hermesExt.register('alpha.ext');
        const beta = window.hermesExt.register('beta.ext');
        assert.deepStrictEqual(Object.keys(alpha).sort(), ['events', 'id', 'settings', 'storage']);
        assert.strictEqual(Object.isFrozen(alpha.events), true);

        const alphaEvents = [];
        const betaEvents = [];
        const unsubscribeStart = alpha.events.on('turn:start', event => {{
          assert.strictEqual(Object.isFrozen(event), true);
          alphaEvents.push(event);
        }});
        alpha.events.on('turn:complete', () => {{ throw new Error('extension failure'); }});
        alpha.events.on('turn:complete', event => alphaEvents.push(event));
        alpha.events.on('turn:error', event => alphaEvents.push(event));
        alpha.events.on('turn:cancel', event => alphaEvents.push(event));
        beta.events.on('turn:complete', event => betaEvents.push(event));

        assert.strictEqual(typeof unsubscribeStart, 'function');
        assert.strictEqual(alpha.events.on('token', () => {{}}), null);
        assert.strictEqual(alpha.events.on('turn:start', null), null);

        const emit = window.HermesExtensionSettings._dispatchTurnLifecycle;
        assert.strictEqual(typeof emit, 'function');
        assert.strictEqual(emit('turn:start', {{sessionId: '', streamId: 'stream-a'}}), false);
        assert.strictEqual(emit('turn:start', {{sessionId: 'session-a', streamId: ''}}), false);
        assert.strictEqual(emit('token', {{sessionId: 'session-a', streamId: 'stream-a'}}), false);

        assert.strictEqual(emit('turn:start', {{
          sessionId: 'session-a', streamId: 'stream-a', startedAt: 10,
        }}), true);
        assert.strictEqual(emit('turn:start', {{
          sessionId: 'session-a', streamId: 'stream-a', startedAt: 11,
        }}), false);
        assert.strictEqual(emit('turn:complete', {{
          sessionId: 'session-a', streamId: 'stream-a', status: 'completed', endedAt: 20,
        }}), true);
        assert.strictEqual(emit('turn:error', {{
          sessionId: 'session-a', streamId: 'stream-a', status: 'late-error', endedAt: 21,
        }}), false);
        assert.strictEqual(emit('turn:cancel', {{
          sessionId: 'session-a', streamId: 'stream-a', status: 'late-cancel', endedAt: 22,
        }}), false);

        assert.strictEqual(emit('turn:start', {{sessionId: 'session-b', streamId: 'stream-b'}}), true);
        assert.strictEqual(emit('turn:error', {{
          sessionId: 'session-b', streamId: 'stream-b', status: 'provider_error',
        }}), true);
        assert.strictEqual(emit('turn:start', {{sessionId: 'session-c', streamId: 'stream-c'}}), true);
        assert.strictEqual(emit('turn:cancel', {{
          sessionId: 'session-c', streamId: 'stream-c', status: 'cancelled',
        }}), true);

        unsubscribeStart();
        unsubscribeStart();
        assert.strictEqual(emit('turn:start', {{sessionId: 'session-d', streamId: 'stream-d'}}), true);

        assert.deepStrictEqual(
          alphaEvents.map(event => [event.type, event.sessionId, event.streamId, event.status || null]),
            [
              ['turn:start', 'session-a', 'stream-a', null],
              ['turn:complete', 'session-a', 'stream-a', 'completed'],
              ['turn:start', 'session-b', 'stream-b', null],
              ['turn:error', 'session-b', 'stream-b', 'provider_error'],
              ['turn:start', 'session-c', 'stream-c', null],
              ['turn:cancel', 'session-c', 'stream-c', 'cancelled'],
            ],
        );
        assert.deepStrictEqual(
          betaEvents.map(event => [event.type, event.sessionId, event.streamId]),
          [['turn:complete', 'session-a', 'stream-a']],
        );
        assert.strictEqual(loggedErrors.length, 1);
        assert.match(loggedErrors[0], /alpha[.]ext.*turn:complete.*extension failure/);
        """
    )
    _run_node(script)


def test_live_stream_bridge_forwards_normalized_lifecycle_details():
    bridge = _function_body(MESSAGES_JS, "_dispatchExtensionTurnLifecycle")
    script = textwrap.dedent(
        f"""
        const assert = require('assert');
        const calls = [];
        global.window = {{
          HermesExtensionSettings: {{
            _dispatchTurnLifecycle(type, details) {{
              calls.push([type, details]);
              return 'delivered';
            }},
          }},
        }};
        eval({json.dumps(bridge)});

        assert.strictEqual(
          _dispatchExtensionTurnLifecycle(
            'turn:error', 'session-a', 'stream-a', {{status: 'connection_lost'}},
          ),
          'delivered',
        );
        assert.deepStrictEqual(calls, [[
          'turn:error',
          {{sessionId: 'session-a', streamId: 'stream-a', status: 'connection_lost'}},
        ]]);

        delete window.HermesExtensionSettings;
        assert.strictEqual(
          _dispatchExtensionTurnLifecycle('turn:start', 'session-b', 'stream-b'),
          false,
        );

        window.HermesExtensionSettings = {{
          _dispatchTurnLifecycle() {{ throw new Error('broken extension runtime'); }},
        }};
        global.console = {{error() {{}}}};
        assert.strictEqual(
          _dispatchExtensionTurnLifecycle('turn:start', 'session-c', 'stream-c'),
          false,
        );
        """
    )
    _run_node(script)


def test_live_stream_terminal_paths_use_original_stream_owner_identity():
    attach_start = MESSAGES_JS.index("function attachLiveStream(")
    attach_body = MESSAGES_JS[attach_start : MESSAGES_JS.index("\nfunction transcript(", attach_start)]
    done = _event_listener_body(MESSAGES_JS, "done")
    application_error = _event_listener_body(MESSAGES_JS, "apperror")
    cancel = _event_listener_body(MESSAGES_JS, "cancel")
    connection_error = _function_body(MESSAGES_JS, "_handleStreamError")

    start_dispatch = attach_body.index("_dispatchExtensionTurnLifecycle('turn:start',activeSid,streamId")
    dead_reconnect_return = attach_body.index("_scheduleAnchorRegistryCleanup(120000);")
    event_source_attach = attach_body.index("_wireSSE(new EventSource", start_dispatch)
    assert dead_reconnect_return < start_dispatch < event_source_attach
    assert "_dispatchExtensionTurnLifecycle('turn:complete',activeSid,streamId" in done
    assert "_dispatchExtensionTurnLifecycle(_extensionErrorType,activeSid,streamId" in application_error
    assert "_dispatchExtensionTurnLifecycle('turn:cancel',activeSid,streamId" in cancel
    assert "_dispatchExtensionTurnLifecycle('turn:error',activeSid,streamId" in connection_error

    assert "_dispatchExtensionTurnLifecycle('turn:complete',completedSid" not in done
    assert "_dispatchExtensionTurnLifecycle(_extensionErrorType,d.session_id" not in application_error
    assert "_dispatchExtensionTurnLifecycle('turn:cancel',_cancelData.session_id" not in cancel
