"""Regression coverage for issue #6481 verification follow-up contamination."""

from api import streaming


PHANTOM_PARAGRAPH = (
    "Verification already ran and passed - 12/12 tests green in the output "
    "above. The system prompt is re-firing the stale check but the evidence "
    "is fresh from this turn. Nothing else to run."
)
VERIFICATION_EVIDENCE = {
    "status": "passed",
    "kind": "terminal",
    "scope": "workspace",
    "canonical_command": "pytest tests/test_app.py -q",
}


def _current_turn_prefix(*, include_natural_answer):
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
    if include_natural_answer:
        messages.append({"role": "assistant", "content": "The failing test is fixed."})
    return messages


def _verification_followup(marker, phantom=PHANTOM_PARAGRAPH):
    return [
        {"role": "assistant", "content": "premature done", marker: True},
        {"role": "user", "content": "[System: verify the workspace]", marker: True},
        {"role": "assistant", "content": phantom},
    ]


def _merge(result_messages, previous=None, msg_text="Fix the failing test."):
    previous = list(previous or [{"role": "user", "content": "Fix the failing test."}])
    return streaming._merge_display_messages_after_agent_result(
        previous, previous, result_messages, msg_text
    )


def test_issue6481_phantom_followup_removed_after_natural_answer():
    previous = _current_turn_prefix(include_natural_answer=True)
    merged = _merge(
        previous + _verification_followup("_verification_stop_synthetic"),
        previous=previous,
    )

    contents = [message.get("content") for message in merged]
    assert "The failing test is fixed." in contents
    assert PHANTOM_PARAGRAPH not in contents
    assert all(not streaming._is_synthetic_control_message(message) for message in merged)


def test_verification_answer_survives_when_nudge_is_first_visible_answer():
    for marker in ("_verification_stop_synthetic", "_pre_verify_synthetic"):
        previous = _current_turn_prefix(include_natural_answer=False)
        merged = _merge(previous + _verification_followup(marker), previous=previous)

        assert PHANTOM_PARAGRAPH in [message.get("content") for message in merged]
        assert all(not streaming._is_synthetic_control_message(message) for message in merged)


def test_pre_verify_redundant_followup_matches_verify_on_stop():
    previous = _current_turn_prefix(include_natural_answer=True)
    merged = _merge(
        previous + _verification_followup("_pre_verify_synthetic"),
        previous=previous,
    )

    contents = [message.get("content") for message in merged]
    assert contents.count("The failing test is fixed.") == 1
    assert PHANTOM_PARAGRAPH not in contents


def test_error_row_before_nudge_does_not_block_first_legitimate_completion():
    previous = _current_turn_prefix(include_natural_answer=False) + [
        {"role": "assistant", "content": "**Runtime error:** pytest crashed", "_error": True}
    ]
    merged = _merge(
        previous + _verification_followup("_verification_stop_synthetic", "Verified and fixed."),
        previous=previous,
    )

    contents = [message.get("content") for message in merged]
    assert "Verified and fixed." in contents


def test_delta_followup_without_current_user_row_keeps_first_legitimate_completion():
    previous = [
        {"role": "user", "content": "Earlier request."},
        {"role": "assistant", "content": "Earlier answer."},
    ]
    merged = _merge(
        _verification_followup("_verification_stop_synthetic", "Verified and fixed."),
        previous=previous,
        msg_text="Run the verification follow-up.",
    )

    contents = [message.get("content") for message in merged]
    assert "Earlier answer." in contents
    assert "Verified and fixed." in contents


def test_unmarked_adjacent_assistant_rows_remain_unchanged():
    messages = [
        {"role": "user", "content": "Give me two alternatives."},
        {"role": "assistant", "content": "First alternative."},
        {"role": "assistant", "content": "Second alternative."},
    ]

    assert streaming._drop_synthetic_control_messages(messages) == messages
