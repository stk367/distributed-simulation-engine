from __future__ import annotations

import os
import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import Request
from fastapi.responses import JSONResponse


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


class SecurityRuntimeConfig:
    def __init__(self) -> None:
        self.auth_enabled = _env_bool("SIM_AUTH_ENABLED", default=False)
        self.api_key = os.getenv("SIM_API_KEY", "")
        self.rate_limit_per_minute = max(0, _env_int("SIM_RATE_LIMIT_PER_MINUTE", default=0))


def create_security_middleware(config: SecurityRuntimeConfig):
    history: dict[str, deque[float]] = defaultdict(deque)
    lock = Lock()
    last_cleanup_at = 0.0

    async def middleware(request: Request, call_next):
        nonlocal last_cleanup_at
        if request.url.path == "/health":
            return await call_next(request)

        if config.auth_enabled:
            key = request.headers.get("x-api-key", "")
            if not config.api_key or key != config.api_key:
                return JSONResponse(status_code=401, content={"detail": "Unauthorized"})

        if config.rate_limit_per_minute > 0:
            now = time.time()
            window_start = now - 60.0
            remote_host = request.client.host if request.client else "unknown"
            bucket_key = f"{remote_host}:{request.url.path}"

            with lock:
                # Periodically prune stale buckets to avoid unbounded memory growth.
                if now - last_cleanup_at >= 60.0:
                    for key, values in list(history.items()):
                        while values and values[0] < window_start:
                            values.popleft()
                        if not values:
                            history.pop(key, None)
                    last_cleanup_at = now

                bucket = history[bucket_key]
                while bucket and bucket[0] < window_start:
                    bucket.popleft()
                if len(bucket) >= config.rate_limit_per_minute:
                    return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})
                bucket.append(now)

        return await call_next(request)

    return middleware
