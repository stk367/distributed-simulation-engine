from __future__ import annotations

import json
import re
from pathlib import Path

from pydantic import ValidationError

from .models import ReplayRunRequest


class TraceStore:
    _TRACE_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$")

    def __init__(self, base_dir: Path) -> None:
        self.base_dir = base_dir.resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _validate_trace_id(self, trace_id: str) -> str:
        if not self._TRACE_ID_PATTERN.fullmatch(trace_id):
            raise ValueError(
                "Invalid trace_id. Use 1-120 characters: letters, numbers, underscore, hyphen; must start with a letter or number"
            )
        return trace_id

    def _trace_file(self, trace_id: str) -> Path:
        safe_trace_id = self._validate_trace_id(trace_id)
        path = (self.base_dir / f"{safe_trace_id}.json").resolve()
        if not path.is_relative_to(self.base_dir):
            raise ValueError("Invalid trace_id")
        return path

    def save_trace(self, trace_id: str, payload: ReplayRunRequest) -> None:
        path = self._trace_file(trace_id)
        try:
            with path.open("x", encoding="utf-8") as handle:
                handle.write(payload.model_dump_json(indent=2))
        except FileExistsError as exc:
            raise ValueError(f"Trace already exists: {trace_id}") from exc

    def load_trace(self, trace_id: str) -> ReplayRunRequest:
        path = self._trace_file(trace_id)
        if not path.exists():
            raise ValueError(f"Trace not found: {trace_id}")
        try:
            content = path.read_text(encoding="utf-8")
            data = json.loads(content)
            return ReplayRunRequest.model_validate(data)
        except (OSError, json.JSONDecodeError, ValidationError) as exc:
            raise ValueError(f"Trace is invalid: {trace_id}") from exc

    def delete_trace(self, trace_id: str) -> None:
        path = self._trace_file(trace_id)
        if not path.exists():
            raise ValueError(f"Trace not found: {trace_id}")
        try:
            path.unlink()
        except OSError as exc:
            raise ValueError(f"Trace could not be deleted: {trace_id}") from exc

    def list_traces(self) -> list[str]:
        trace_ids: list[str] = []
        for item in sorted(self.base_dir.glob("*.json")):
            if self._TRACE_ID_PATTERN.fullmatch(item.stem):
                trace_ids.append(item.stem)
        return trace_ids
