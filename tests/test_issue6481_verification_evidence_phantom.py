"""Regression coverage for issue #6481 verification follow-up contracts."""

from api import streaming


ATTEMPTED_ANSWER = "The failing test is fixed."
CORRECTIVE_ANSWER = "Verification failed. I fixed the parser and reran the tests."
VERIFICATION_EVIDENCE = {
    "status": "passed",
    "kind": "terminal",
    "scope": "workspace",
    "canonical_command": "pytest tests/test_app.py -q",
}


def _current_turn_prefix(*, include_attempted_answer):
    messages = [
        {"role": "user", "content": "Fix the failing test."},
        {
            "role": "assistant",
            "content": [{"type": "tool_use", "name": "terminal", "input": {"cmd": "pytest"}}],
        },
        {
            "role": "tool",
            "tool_call_id": "terminal",
            "content": "Tests passed.",
            "verification_evidence": VERIFICATION_EVIDENCE,
        },
    ]
    if include_attempted_answer:
        messages.append({"role": "assistant", "content": ATTEMPTED_ANSWER})
    return messages


def _verification_followup(marker, corrective=CORRECTIVE_ANSWER):
    return [
        {"role": "user", "content": "[System: verify the workspace]", marker: True},
        {"role": "assistant", "content": corrective},
    ]


def _merge(result_messages, previous=None, msg_text="Fix the failing test."):
    previous = list(previous or [{"role": "user", "content": "Fix the failing test."}])
    return streaming._merge_display_messages_after_agent_result(
        previous, previous, result_messages, msg_text
    )


def test_corrective_followup_survives_after_attempted_answer_for_both_markers():
    for marker in ("_verification_stop_synthetic", "_pre_verify_synthetic"):
        previous = _current_turn_prefix(include_attempted_answer=True)
        merged = _merge(
            previous + _verification_followup(marker),
            previous=previous,
        )

        contents = [message.get("content") for message in merged]
        assert contents.count(ATTEMPTED_ANSWER) == 1
        assert CORRECTIVE_ANSWER in contents
        assert "[System: verify the workspace]" not in contents
        assert all(not streaming._is_synthetic_control_message(message) for message in merged)


def test_delta_only_followup_preserves_corrective_answer():
    for marker in ("_verification_stop_synthetic", "_pre_verify_synthetic"):
        previous = _current_turn_prefix(include_attempted_answer=True)
        merged = _merge(
            _verification_followup(marker),
            previous=previous,
        )

        contents = [message.get("content") for message in merged]
        assert ATTEMPTED_ANSWER in contents
        assert CORRECTIVE_ANSWER in contents
        assert "[System: verify the workspace]" not in contents


def test_first_post_nudge_answer_survives_when_no_attempted_answer_exists():
    for marker in ("_verification_stop_synthetic", "_pre_verify_synthetic"):
        previous = _current_turn_prefix(include_attempted_answer=False)
        merged = _merge(
            previous + _verification_followup(marker),
            previous=previous,
        )

        contents = [message.get("content") for message in merged]
        assert CORRECTIVE_ANSWER in contents
        assert "[System: verify the workspace]" not in contents


def test_unmarked_adjacent_assistant_rows_remain_unchanged():
    messages = [
        {"role": "user", "content": "Give me two alternatives."},
        {"role": "assistant", "content": "First alternative."},
        {"role": "assistant", "content": "Second alternative."},
    ]

    assert streaming._drop_synthetic_control_messages(messages) == messages
