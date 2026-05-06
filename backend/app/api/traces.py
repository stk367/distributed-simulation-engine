from __future__ import annotations

from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.simulation.engine import run_replay
from app.simulation.models import ReplayRunRequest, ReplayRunResponse
from app.simulation.trace_store import TraceStore

router = APIRouter(prefix="/traces", tags=["traces"])
store = TraceStore(base_dir=Path(__file__).resolve().parents[2] / "data" / "traces")


class CreateTraceRequest(BaseModel):
    trace_id: str = Field(min_length=1, max_length=120)
    payload: ReplayRunRequest


class TraceListResponse(BaseModel):
    traces: list[str]


@router.get("", response_model=TraceListResponse)
def list_traces() -> TraceListResponse:
    return TraceListResponse(traces=store.list_traces())


@router.post("", status_code=201)
def create_trace(request: CreateTraceRequest) -> dict[str, str]:
    try:
        store.save_trace(request.trace_id, request.payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"trace_id": request.trace_id}


@router.get("/{trace_id}", response_model=ReplayRunRequest)
def get_trace(trace_id: str) -> ReplayRunRequest:
    try:
        return store.load_trace(trace_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{trace_id}", status_code=204)
def delete_trace(trace_id: str) -> None:
    try:
        store.delete_trace(trace_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{trace_id}/run", response_model=ReplayRunResponse)
def run_saved_trace(
    trace_id: str,
    policy: Literal["round_robin", "least_connections", "latency_aware"] | None = Query(default=None),
    latency_window_size: int | None = Query(default=None, ge=1, le=500),
) -> ReplayRunResponse:
    try:
        request = store.load_trace(trace_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    if policy is not None:
        request.config.policy = policy
    if latency_window_size is not None:
        request.config.latency_window_size = latency_window_size

    try:
        return run_replay(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
