import pytest

from app.simulation.engine import run_replay, snapshots_to_batches
from app.simulation.models import NodeState, ReplayConfig, ReplayEvent, ReplayRunRequest
from app.simulation.policies import LeastConnectionsPolicy


def build_request(policy: str) -> ReplayRunRequest:
    nodes = [
        NodeState(node_id="node-a", capacity=2),
        NodeState(node_id="node-b", capacity=2),
    ]
    events = [
        ReplayEvent(event_id="e1", tick=0, sequence=0, event_type="request_submitted", request_id="r1"),
        ReplayEvent(event_id="e2", tick=0, sequence=1, event_type="request_submitted", request_id="r2"),
        ReplayEvent(event_id="e3", tick=1, sequence=0, event_type="request_routed", request_id="r1"),
        ReplayEvent(event_id="e4", tick=1, sequence=1, event_type="request_routed", request_id="r2"),
        ReplayEvent(event_id="e5", tick=3, sequence=0, event_type="request_completed", request_id="r1"),
        ReplayEvent(event_id="e6", tick=4, sequence=0, event_type="request_completed", request_id="r2"),
    ]
    return ReplayRunRequest(config=ReplayConfig(policy=policy), nodes=nodes, events=events)


def test_replay_is_deterministic_across_runs() -> None:
    request = build_request("round_robin")

    first = run_replay(request)
    second = run_replay(request)
    third = run_replay(request)

    assert first.state_hash == second.state_hash == third.state_hash
    assert [s.model_dump() for s in first.snapshots] == [s.model_dump() for s in second.snapshots]


def test_supported_policies_execute() -> None:
    for policy in ["round_robin", "least_connections", "latency_aware"]:
        result = run_replay(build_request(policy))
        assert result.total_ticks > 0
        assert len(result.snapshots) > 0


def test_duplicate_node_ids_are_rejected() -> None:
    request = build_request("round_robin")
    request.nodes = [
        NodeState(node_id="node-a", capacity=2),
        NodeState(node_id="node-a", capacity=2),
    ]

    with pytest.raises(ValueError, match="Duplicate node_id"):
        run_replay(request)


def test_least_connections_stable_tie_break() -> None:
    nodes = [
        NodeState(node_id="node-a", capacity=2),
        NodeState(node_id="node-b", capacity=2),
    ]
    selected = LeastConnectionsPolicy().select_node(nodes=nodes, _requests={})
    assert selected == "node-a"


def test_snapshot_batches_are_monotonic() -> None:
    request = build_request("round_robin")
    response = run_replay(request)
    batches = snapshots_to_batches(response.snapshots, batch_size=2)

    assert len(batches) >= 1
    flattened_ticks = [snapshot.tick for batch in batches for snapshot in batch]
    assert flattened_ticks == sorted(flattened_ticks)
