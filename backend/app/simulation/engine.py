from __future__ import annotations

import hashlib
import json
from collections import defaultdict

from .models import (
    MetricsSnapshot,
    ReplayEvent,
    ReplayRunRequest,
    ReplayRunResponse,
    RequestStatus,
    SimulationState,
)
from .policies import create_policy


def _percentile(sorted_values: list[int], percentile: float) -> float:
    if not sorted_values:
        return 0.0
    index = int((len(sorted_values) - 1) * percentile)
    return float(sorted_values[index])


def _snapshot_from_state(tick: int, state: SimulationState) -> MetricsSnapshot:
    per_node_active = {node_id: len(node.active_requests) for node_id, node in state.nodes.items()}
    per_node_utilization = {
        node_id: (len(node.active_requests) / node.capacity if node.capacity else 0.0)
        for node_id, node in state.nodes.items()
    }

    queue_depth = sum(1 for req in state.requests.values() if req.status == RequestStatus.QUEUED)
    completed_requests = sum(1 for req in state.requests.values() if req.status == RequestStatus.COMPLETED)

    latencies = sorted(state.latencies_ms)
    avg_latency = float(sum(latencies) / len(latencies)) if latencies else 0.0

    return MetricsSnapshot(
        tick=tick,
        queue_depth=queue_depth,
        completed_requests=completed_requests,
        avg_latency_ms=avg_latency,
        p95_latency_ms=_percentile(latencies, 0.95),
        p99_latency_ms=_percentile(latencies, 0.99),
        per_node_active=per_node_active,
        per_node_utilization=per_node_utilization,
    )


def _state_hash(state: SimulationState) -> str:
    payload = {
        "nodes": {k: v.model_dump(mode="json") for k, v in sorted(state.nodes.items())},
        "requests": {k: v.model_dump(mode="json") for k, v in sorted(state.requests.items())},
        "latencies": list(state.latencies_ms),
        "metrics_history": [m.model_dump(mode="json") for m in state.metrics_history],
    }
    raw = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _validate_replay_request(request: ReplayRunRequest) -> None:
    node_ids = [node.node_id for node in request.nodes]
    if len(node_ids) != len(set(node_ids)):
        raise ValueError("Duplicate node_id values are not allowed")

    event_ids = [event.event_id for event in request.events]
    if len(event_ids) != len(set(event_ids)):
        raise ValueError("Duplicate event_id values are not allowed")

    routing_keys: set[tuple[int, int]] = set()
    for event in request.events:
        key = (event.tick, event.sequence)
        if key in routing_keys:
            raise ValueError("Duplicate (tick, sequence) pairs are not allowed")
        routing_keys.add(key)


def snapshots_to_batches(snapshots: list[MetricsSnapshot], batch_size: int) -> list[list[MetricsSnapshot]]:
    if batch_size <= 0:
        raise ValueError("batch_size must be greater than zero")
    return [snapshots[index : index + batch_size] for index in range(0, len(snapshots), batch_size)]


def run_replay(request: ReplayRunRequest) -> ReplayRunResponse:
    _validate_replay_request(request)

    nodes = {node.node_id: node.model_copy(deep=True) for node in request.nodes}
    state = SimulationState(nodes=nodes, requests={})

    policy = create_policy(request.config.policy, request.config.latency_window_size)
    events = sorted(request.events, key=lambda event: (event.tick, event.sequence, event.event_id))

    ticks: dict[int, list[ReplayEvent]] = defaultdict(list)
    for event in events:
        ticks[event.tick].append(event)

    for tick in sorted(ticks.keys()):
        for event in ticks[tick]:
            if event.event_type == "request_submitted":
                if not event.request_id:
                    raise ValueError("request_submitted event requires request_id")
                if event.request_id in state.requests:
                    continue
                from .models import RequestState

                state.requests[event.request_id] = RequestState(
                    request_id=event.request_id,
                    submitted_tick=tick,
                )

            elif event.event_type == "request_routed":
                if not event.request_id:
                    raise ValueError("request_routed event requires request_id")
                request_state = state.requests.get(event.request_id)
                if not request_state or request_state.status != RequestStatus.QUEUED:
                    continue

                node_id = event.node_id
                if not node_id:
                    available_nodes = list(state.nodes.values())
                    node_id = policy.select_node(available_nodes, state.requests)

                node = state.nodes.get(node_id)
                if not node or not node.healthy:
                    continue
                if len(node.active_requests) >= node.capacity:
                    continue

                request_state.assigned_node_id = node_id
                request_state.routed_tick = tick
                request_state.status = RequestStatus.RUNNING
                node.active_requests.append(request_state.request_id)

            elif event.event_type == "request_completed":
                if not event.request_id:
                    raise ValueError("request_completed event requires request_id")
                request_state = state.requests.get(event.request_id)
                if not request_state or request_state.status != RequestStatus.RUNNING:
                    continue

                request_state.completed_tick = tick
                request_state.status = RequestStatus.COMPLETED

                if request_state.assigned_node_id:
                    node = state.nodes[request_state.assigned_node_id]
                    if request_state.request_id in node.active_requests:
                        node.active_requests.remove(request_state.request_id)
                    latency = tick - request_state.submitted_tick
                    state.latencies_ms.append(latency)
                    node.latency_window.append(latency)

            elif event.event_type == "node_failure":
                if not event.node_id:
                    raise ValueError("node_failure event requires node_id")
                node = state.nodes.get(event.node_id)
                if node:
                    node.healthy = False

            elif event.event_type == "node_recovered":
                if not event.node_id:
                    raise ValueError("node_recovered event requires node_id")
                node = state.nodes.get(event.node_id)
                if node:
                    node.healthy = True

        state.metrics_history.append(_snapshot_from_state(tick=tick, state=state))

    return ReplayRunResponse(
        state_hash=_state_hash(state),
        snapshots=state.metrics_history,
        total_ticks=len(ticks),
    )
