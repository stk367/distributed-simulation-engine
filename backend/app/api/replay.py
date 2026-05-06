from fastapi import APIRouter, HTTPException

from app.simulation.engine import run_replay
from app.simulation.models import ReplayRunRequest, ReplayRunResponse

router = APIRouter(prefix="/replay", tags=["replay"])


@router.post("/run", response_model=ReplayRunResponse)
def run(request: ReplayRunRequest) -> ReplayRunResponse:
    try:
        return run_replay(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
