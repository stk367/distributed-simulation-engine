from pathlib import Path

import pytest
from pydantic import ValidationError

from app.simulation.models import NodeState, ReplayConfig, ReplayEvent, ReplayRunRequest
from app.simulation.trace_store import TraceStore


def _sample_request() -> ReplayRunRequest:
    return ReplayRunRequest(
        config=ReplayConfig(policy="round_robin"),
        nodes=[NodeState(node_id="node-a", capacity=1)],
        events=[
            ReplayEvent(
                event_id="e1",
                tick=0,
                sequence=0,
                event_type="request_submitted",
                request_id="r1",
            )
        ],
    )


def test_trace_store_rejects_path_traversal_ids(tmp_path: Path) -> None:
    store = TraceStore(base_dir=tmp_path / "traces")

    with pytest.raises(ValueError, match="Invalid trace_id"):
        store.save_trace("../escape", _sample_request())


@pytest.mark.parametrize("invalid_id", ["..", "trace/name", "trace\\name", " trace", "trace$", ""])
def test_trace_store_rejects_invalid_characters(tmp_path: Path, invalid_id: str) -> None:
    store = TraceStore(base_dir=tmp_path / "traces")

    with pytest.raises(ValueError, match="Invalid trace_id"):
        store.save_trace(invalid_id, _sample_request())


def test_trace_store_rejects_malformed_json_trace(tmp_path: Path) -> None:
    store = TraceStore(base_dir=tmp_path / "traces")
    malformed = store.base_dir / "bad-trace.json"
    malformed.write_text("{ invalid json", encoding="utf-8")

    with pytest.raises(ValueError, match="Trace is invalid"):
        store.load_trace("bad-trace")


def test_trace_store_rejects_schema_invalid_trace(tmp_path: Path) -> None:
    store = TraceStore(base_dir=tmp_path / "traces")
    invalid_schema = store.base_dir / "wrong-shape.json"
    invalid_schema.write_text('{"config": {"policy": "round_robin"}}', encoding="utf-8")

    with pytest.raises(ValueError, match="Trace is invalid"):
        store.load_trace("wrong-shape")


def test_trace_store_duplicate_create_does_not_overwrite_existing(tmp_path: Path) -> None:
    store = TraceStore(base_dir=tmp_path / "traces")
    original = _sample_request()
    replacement = ReplayRunRequest(
        config=ReplayConfig(policy="least_connections"),
        nodes=[NodeState(node_id="node-b", capacity=2)],
        events=[
            ReplayEvent(
                event_id="e2",
                tick=0,
                sequence=0,
                event_type="request_submitted",
                request_id="r2",
            )
        ],
    )

    store.save_trace("stable-trace", original)

    with pytest.raises(ValueError, match="Trace already exists"):
        store.save_trace("stable-trace", replacement)

    loaded = store.load_trace("stable-trace")
    assert loaded == original


def test_trace_store_delete_removes_trace(tmp_path: Path) -> None:
    store = TraceStore(base_dir=tmp_path / "traces")
    store.save_trace("to-delete", _sample_request())

    store.delete_trace("to-delete")

    with pytest.raises(ValueError, match="Trace not found"):
        store.load_trace("to-delete")


def test_trace_store_delete_missing_trace_raises(tmp_path: Path) -> None:
    store = TraceStore(base_dir=tmp_path / "traces")

    with pytest.raises(ValueError, match="Trace not found"):
        store.delete_trace("missing-trace")


def test_replay_request_rejects_oversized_event_list() -> None:
    events = [
        {
            "event_id": f"e{index}",
            "tick": index,
            "sequence": 0,
            "event_type": "request_submitted",
            "request_id": f"r{index}",
        }
        for index in range(20001)
    ]

    with pytest.raises(ValidationError):
        ReplayRunRequest.model_validate(
            {
                "config": {"policy": "round_robin", "latency_window_size": 20},
                "nodes": [{"node_id": "node-a", "capacity": 1}],
                "events": events,
            }
        )
