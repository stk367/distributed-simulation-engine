# Distributed Simulation Engine

A replay-first web dashboard for simulating load balancing of LLM requests.

## Scope (V1)
- Deterministic replay engine
- Routing policies: Round Robin, Least Connections, Latency-Aware
- FastAPI backend for replay control and streaming snapshots
- React frontend dashboard for replay controls, timeline, node status, and metrics

## Out of Scope (V1)
- Real LLM provider invocation
- Authentication and multi-tenant persistence
- Production autoscaling logic

## Security Notice (Current V1)
- This project is for local/dev simulation workflows and is not production hardened.
- API endpoints currently have no authentication/authorization and no rate limiting.
- Keep backend bound to loopback (`127.0.0.1`) and do not expose it directly to public networks.

## Project Layout
- `backend/` FastAPI app and deterministic simulation core
- `frontend/` React dashboard
- `docs/` simulation model and determinism rules

## Quick Start
1. Backend test run:
	- `../.venv/Scripts/python.exe -m pip install -e "./backend[dev]"`
	- `cd backend`
	- `../.venv/Scripts/python.exe -m pytest -q`
2. Backend API:
	- `cd backend`
	- `../.venv/Scripts/python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`
3. Frontend:
	- `cd frontend`
	- `npm install`
	- `npm run dev`

## Documentation
- Architecture: `docs/ARCHITECTURE.md`
- Simulation model: `docs/SIMULATION_MODEL.md`
- Determinism rules: `docs/DETERMINISM.md`
- Routing policy extension guide: `docs/ROUTING_POLICIES.md`
- Onboarding and runbook: `docs/ONBOARDING.md`
- Deployment profiles and env config: `docs/DEPLOYMENT_PROFILES.md`
- Known limitations and out-of-scope: `docs/KNOWN_LIMITATIONS.md`

## Guardrails
See `.github/copilot-instructions.md` for project-wide coding and architecture constraints.

## Status
Phase 4 documentation and developer onboarding baseline is implemented.
