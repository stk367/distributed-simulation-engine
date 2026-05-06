from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


EventType = Literal[
    "request_submitted",
    "request_routed",
    "request_completed",
    "node_failure",
    "node_recovered",
]


class RequestStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"


class NodeState(BaseModel):
    node_id: str
    capacity: int = Field(ge=1)
    active_requests: list[str] = Field(default_factory=list)
    healthy: bool = True
    latency_window: list[int] = Field(default_factory=list)


class RequestState(BaseModel):
    request_id: str
    submitted_tick: int
    routed_tick: int | None = None
    completed_tick: int | None = None
    assigned_node_id: str | None = None
    status: RequestStatus = RequestStatus.QUEUED


class ReplayEvent(BaseModel):
    event_id: str
    tick: int = Field(ge=0)
    sequence: int = Field(ge=0)
    event_type: EventType
    request_id: str | None = None
    node_id: str | None = None
    latency_ms: int | None = Field(default=None, ge=0)


class MetricsSnapshot(BaseModel):
    tick: int
    queue_depth: int
    completed_requests: int
    avg_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    per_node_active: dict[str, int]
    per_node_utilization: dict[str, float]


class SimulationState(BaseModel):
    nodes: dict[str, NodeState]
    requests: dict[str, RequestState]
    metrics_history: list[MetricsSnapshot] = Field(default_factory=list)
    latencies_ms: list[int] = Field(default_factory=list)


class ReplayConfig(BaseModel):
    policy: Literal["round_robin", "least_connections", "latency_aware"]
    latency_window_size: int = Field(default=20, ge=1, le=500)


class ReplayRunRequest(BaseModel):
    config: ReplayConfig
    nodes: list[NodeState] = Field(max_length=500)
    events: list[ReplayEvent] = Field(max_length=20000)


class ReplayRunResponse(BaseModel):
    state_hash: str
    snapshots: list[MetricsSnapshot]
    total_ticks: int
