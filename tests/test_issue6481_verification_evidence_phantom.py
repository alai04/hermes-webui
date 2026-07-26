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


def _merge(
    result_messages,
    previous=None,
    previous_context=None,
    msg_text="Fix the failing test.",
    writeback_provenance=None,
):
    previous = list(previous or [{"role": "user", "content": "Fix the failing test."}])
    previous_context = list(previous_context if previous_context is not None else previous)
    return streaming._merge_display_messages_after_agent_result(
        previous,
        previous_context,
        result_messages,
        msg_text,
        verification_nudge_provenance=writeback_provenance,
    )


def _role_content_sequence(messages):
    return [(message["role"], message.get("content")) for message in messages]


def _expected_current_turn(*, include_attempted_answer):
    expected = _current_turn_prefix(include_attempted_answer=include_attempted_answer)
    return expected + [{"role": "assistant", "content": CORRECTIVE_ANSWER}]


def test_corrective_followup_survives_after_attempted_answer_for_both_markers():
    for marker in ("_verification_stop_synthetic", "_pre_verify_synthetic"):
        previous = _current_turn_prefix(include_attempted_answer=True)
        merged = _merge(
            previous + _verification_followup(marker),
            previous=previous,
        )

        assert _role_content_sequence(merged) == _role_content_sequence(
            _expected_current_turn(include_attempted_answer=True)
        )
        assert [message.get("content") for message in merged].count("Fix the failing test.") == 1
        assert all(not streaming._is_synthetic_control_message(message) for message in merged)


def test_delta_only_followup_preserves_corrective_answer():
    for marker in ("_verification_stop_synthetic", "_pre_verify_synthetic"):
        previous = _current_turn_prefix(include_attempted_answer=True)
        merged = _merge(
            _verification_followup(marker),
            previous=previous,
        )

        assert _role_content_sequence(merged) == _role_content_sequence(
            _expected_current_turn(include_attempted_answer=True)
        )
        assert [message.get("content") for message in merged].count("Fix the failing test.") == 1


def test_first_post_nudge_answer_survives_when_no_attempted_answer_exists():
    for marker in ("_verification_stop_synthetic", "_pre_verify_synthetic"):
        previous = _current_turn_prefix(include_attempted_answer=False)
        merged = _merge(
            previous + _verification_followup(marker),
            previous=previous,
        )

        assert _role_content_sequence(merged) == _role_content_sequence(
            _expected_current_turn(include_attempted_answer=False)
        )
        assert [message.get("content") for message in merged].count("Fix the failing test.") == 1


def test_unmarked_adjacent_assistant_rows_remain_unchanged():
    messages = [
        {"role": "user", "content": "Give me two alternatives."},
        {"role": "assistant", "content": "First alternative."},
        {"role": "assistant", "content": "Second alternative."},
    ]

    assert streaming._drop_synthetic_control_messages(messages) == messages


def test_unmarked_assistant_only_new_turn_materializes_current_user_row():
    previous = [
        {"role": "user", "content": "Earlier request."},
        {"role": "assistant", "content": "Earlier answer."},
    ]
    result = [{"role": "assistant", "content": "New answer."}]

    merged = _merge(result, previous=previous, msg_text="New request.")

    assert _role_content_sequence(merged) == [
        ("user", "Earlier request."),
        ("assistant", "Earlier answer."),
        ("user", "New request."),
        ("assistant", "New answer."),
    ]


def test_unmarked_repeated_identical_prompt_materializes_new_user_row():
    previous = [
        {"role": "user", "content": "Fix the failing test."},
        {"role": "assistant", "content": "The first attempt."},
    ]
    result = [{"role": "assistant", "content": "The second attempt."}]

    merged = _merge(result, previous=previous)

    assert _role_content_sequence(merged) == [
        ("user", "Fix the failing test."),
        ("assistant", "The first attempt."),
        ("user", "Fix the failing test."),
        ("assistant", "The second attempt."),
    ]


def test_marked_repeated_old_prompt_materializes_deferred_current_turn():
    prompt = "Fix the failing test."
    previous = [
        {"role": "user", "content": prompt, "timestamp": 1.0},
        {"role": "assistant", "content": "The earlier attempt is complete."},
    ]
    corrective = "Verification failed. I fixed the parser and reran the tests."

    for marker in ("_verification_stop_synthetic", "_pre_verify_synthetic"):
        merged = _merge(
            previous
            + [
                {"role": "user", "content": "[System: verify the workspace]", marker: True},
                {"role": "assistant", "content": corrective},
            ],
            previous=previous,
            msg_text=prompt,
            writeback_provenance={
                "verification_nudge_seen": True,
                "active_turn_identity": {
                    "stream_id": "direct-stream",
                    "text": prompt,
                    "timestamp": 2.0,
                    "source": "webui",
                    "attachments": [],
                },
            },
        )

        assert _role_content_sequence(merged) == [
            ("user", prompt),
            ("assistant", "The earlier attempt is complete."),
            ("user", prompt),
            ("assistant", corrective),
        ]
        assert [message.get("content") for message in merged].count(prompt) == 2


def test_context_only_exact_checkpoint_does_not_suppress_display_boundary():
    prompt = "Fix the failing test."
    previous_display = [
        {"role": "user", "content": prompt, "timestamp": 1.0},
        {"role": "assistant", "content": "The earlier attempt is complete."},
    ]
    previous_context = previous_display + [
        {
            "role": "user",
            "content": prompt,
            "timestamp": 2.0,
            "_source": "webui",
            "attachments": [],
        },
    ]
    corrective = "Verification failed. I fixed the parser and reran the tests."
    aligned_display, _ = streaming._align_active_turn_boundaries(
        previous_display,
        previous_context,
        {
            "stream_id": "direct-stream",
            "text": prompt,
            "timestamp": 2.0,
            "source": "webui",
            "attachments": [],
        },
    )

    merged = _merge(
        [
            {"role": "user", "content": "[System: verify the workspace]", "_verification_stop_synthetic": True},
            {"role": "assistant", "content": corrective},
        ],
        previous=aligned_display,
        previous_context=previous_context,
        msg_text=prompt,
        writeback_provenance={
            "verification_nudge_seen": True,
            "active_turn_identity": {
                "stream_id": "direct-stream",
                "text": prompt,
                "timestamp": 2.0,
                "source": "webui",
                "attachments": [],
            },
        },
    )

    assert _role_content_sequence(merged) == [
        ("user", prompt),
        ("assistant", "The earlier attempt is complete."),
        ("user", prompt),
        ("assistant", corrective),
    ]
