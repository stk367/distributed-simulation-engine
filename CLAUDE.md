# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Test Commands

**Backend (Python 3.11+):**
```bash
# Install dependencies
../.venv/Scripts/python.exe -m pip install -e "./backend[dev]"

# Run tests
cd backend
../.venv/Scripts/python.exe -m pytest -q

# Run API server
../.venv/Scripts/python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Frontend (Node.js 18+):**
```bash
cd frontend
npm install
npm run dev       # Dev server
npm run build     # Production build
```

## Architecture Overview

This is a replay-first distributed simulation dashboard for LLM request load balancing research.

### Backend (`backend/app/`)

```
backend/app/
├── main.py              # FastAPI app, CORS, security middleware
├── security.py          # Auth + rate limiting (env-configured)
├── api/
│   ├── replay.py        # POST /replay/run
│   ├── stream.py        # POST /stream/snapshots, SSE streaming
│   └── traces.py        # CRUD + run saved traces
└── simulation/
    ├── models.py        # Pydantic: NodeState, RequestState, ReplayEvent, MetricsSnapshot
    ├── engine.py        # Deterministic replay: run_replay(), state hash
    ├── policies.py      # RoutingPolicy base + RoundRobin/LeastConnections/LatencyAware
    └── trace_store.py   # Filesystem-backed trace persistence
```

**Key API endpoints:**
- `POST /replay/run` - Execute replay with inline config
- `POST /stream/snapshots` - SSE stream of MetricsSnapshot batches
- `GET/POST/DELETE /traces` - Trace lifecycle
- `POST /traces/{id}/run` - Run saved trace with optional policy override

### Frontend (`frontend/src/`)

React + Vite dashboard with components:
- `ReplayControls` - Policy selection, speed, trace management
- `RequestTimeline` - Visual timeline of replay progress
- `NodePool` - Per-node utilization display
- `MetricsPanel` - Latency metrics + state hash verification
- `PolicyComparison` - Side-by-side policy metrics

State management via `useReplaySimulation` hook handles SSE streaming, abort controllers, and playback.

### Simulation Model

**Event ordering:** `(tick, sequence, event_id)` - all three fields used for stable sort.

**Request lifecycle:** `request_submitted` → `request_routed` → `request_completed`

**Policies:** All must use explicit tie-breakers (node_id) and behave deterministically. See `docs/ROUTING_POLICIES.md` for extension guide.

**State hash:** SHA256 of sorted nodes/requests/latencies for replay verification.

## Documentation Index

- `docs/ARCHITECTURE.md` - High-level component flow
- `docs/SIMULATION_MODEL.md` - Core entities and tick semantics
- `docs/DETERMINISM.md` - Mandatory rules for reproducible simulation
- `docs/ROUTING_POLICIES.md` - How to add new routing policies
- `docs/ONBOARDING.md` - Setup and validation checklist
- `docs/DEPLOYMENT_PROFILES.md` - Environment variables and security posture
- `docs/KNOWN_LIMITATIONS.md` - Current constraints and V1 scope boundaries

## Guardrails

See `.github/copilot-instructions.md` for:
- Architecture boundaries (simulation vs. transport vs. UI)
- Determinism requirements
- Idempotency expectations
- Extension points for policies and event types

**Security:** Current default is no auth/rate-limiting. Keep bound to `127.0.0.1`. Optional hardening via `SIM_AUTH_ENABLED`, `SIM_API_KEY`, `SIM_RATE_LIMIT_PER_MINUTE`.
