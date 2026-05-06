# Onboarding

## Prerequisites
- Python 3.11+ (project currently runs on 3.12 in local setup)
- Node.js 18+
- npm

## Backend Setup
From repository root:
1. Ensure virtual environment is available (already created in `.venv` in this workspace).
2. Install backend dependencies from project metadata:
   - `../.venv/Scripts/python.exe -m pip install -e "./backend[dev]"`
3. Run tests:
   - `cd backend`
   - `../.venv/Scripts/python.exe -m pytest -q`
4. Run API locally:
   - `cd backend`
   - `../.venv/Scripts/python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`

## Frontend Setup
From repository root:
1. Install frontend dependencies:
   - `cd frontend`
   - `npm install`
2. Run frontend dev server:
   - `npm run dev`
3. Build frontend:
   - `npm run build`

## Recommended Local Workflow
Security constraints for this workflow:
- Run locally only; current API has no auth and no rate limiting.
- Keep backend bound to `127.0.0.1` and avoid direct public exposure.

1. Start backend API on `http://127.0.0.1:8000`.
2. Start frontend app and open the Vite URL.
3. Use trace controls to create/select replay datasets.
4. Run replay and compare policies.

## Validation Checklist
- Backend tests pass.
- Frontend build passes.
- Routes include traces and stream endpoints.

## Environment Profiles
See `docs/DEPLOYMENT_PROFILES.md` for optional auth, rate-limit, and environment variable configuration.
