import json
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.simulation.engine import run_replay, snapshots_to_batches
from app.simulation.models import ReplayRunRequest
from app.simulation.trace_store import TraceStore

router = APIRouter(prefix="/stream", tags=["stream"])
store = TraceStore(base_dir=Path(__file__).resolve().parents[2] / "data" / "traces")


def _stream_from_request(request: ReplayRunRequest, batch_size: int) -> StreamingResponse:
    try:
        replay = run_replay(request)
        batches = snapshots_to_batches(replay.snapshots, batch_size=batch_size)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    def event_generator():
        for index, batch in enumerate(batches, start=1):
            payload = {
                "version": index,
                "batch_size": len(batch),
                "snapshots": [snapshot.model_dump(mode="json") for snapshot in batch],
                "state_hash": replay.state_hash,
                "is_final": index == len(batches),
            }
            yield f"data: {json.dumps(payload)}\\n\\n"
        yield "event: done\\ndata: {}\\n\\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/snapshots")
def stream_snapshots(
    request: ReplayRunRequest,
    batch_size: int = Query(default=1, ge=1, le=200),
) -> StreamingResponse:
    return _stream_from_request(request=request, batch_size=batch_size)


@router.post("/traces/{trace_id}/snapshots")
def stream_saved_trace_snapshots(
    trace_id: str,
    batch_size: int = Query(default=1, ge=1, le=200),
    policy: Literal["round_robin", "least_connections", "latency_aware"] | None = Query(default=None),
    latency_window_size: int | None = Query(default=None, ge=1, le=500),
) -> StreamingResponse:
    try:
        request = store.load_trace(trace_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    if policy is not None:
        request.config.policy = policy
    if latency_window_size is not None:
        request.config.latency_window_size = latency_window_size

    return _stream_from_request(request=request, batch_size=batch_size)
