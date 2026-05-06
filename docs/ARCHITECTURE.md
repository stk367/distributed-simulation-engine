# Architecture

## Purpose
This project is a replay-first distributed simulation dashboard for LLM request load balancing.

## High-Level Components
- Backend API: FastAPI transport for replay, streaming, and trace lifecycle endpoints.
- Simulation Core: deterministic engine, routing policies, state snapshots, and hash generation.
- Trace Store: filesystem-backed trace persistence with path-safe trace id validation.
- Frontend Dashboard: React UI for trace management, replay controls, timeline, node pool status, and policy comparison.

## Boundaries
- Domain logic lives under `backend/app/simulation/`.
- Transport/API handlers live under `backend/app/api/`.
- UI concerns live under `frontend/src/`.
- Documentation and operational constraints live under `docs/` and `.github/copilot-instructions.md`.

## Runtime Flow
1. User selects or creates a trace in the dashboard.
2. Frontend calls backend endpoints to run replay or stream snapshots.
3. Simulation engine orders events deterministically and applies state transitions.
4. Backend emits snapshots and final state hash.
5. Frontend renders timeline, node utilization, latency metrics, and policy comparisons.

## Determinism and Safety
- Stable ordering: `(tick, sequence, event_id)`.
- Explicit tie-breakers in policies.
- Idempotent event handling where possible.
- Trace store validates ids and prevents path traversal.

## Primary API Surface
- `POST /replay/run`
- `POST /stream/snapshots`
- `GET /traces`
- `POST /traces`
- `GET /traces/{trace_id}`
- `DELETE /traces/{trace_id}`
- `POST /traces/{trace_id}/run`
- `POST /stream/traces/{trace_id}/snapshots`

## Security Placeholders
- Optional API key gate and per-host+path rate limiting can be enabled with environment variables.
- Middleware behavior is implemented in `backend/app/security.py` and configured at app startup.

## Extension Points
- Routing policies: add new policy in `backend/app/simulation/policies.py` and wire into factory.
- Replay event types: extend event model and deterministic handlers in engine.
- UI visualizations: add new components that consume `MetricsSnapshot` and comparison outputs.
