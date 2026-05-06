# Deployment Profiles

## Overview
This document defines safe deployment posture by environment.

## Local Dev (Current Supported Profile)
- Backend bind: `127.0.0.1`
- Auth: optional via env, disabled by default
- Rate limiting: optional via env, disabled by default
- CORS: broad for local development convenience

## Recommended Environment Variables
- `SIM_AUTH_ENABLED`: `true` or `false`
- `SIM_API_KEY`: API key value used when auth is enabled
- `SIM_RATE_LIMIT_PER_MINUTE`: integer requests-per-minute limit per host+path
- `VITE_API_BASE_URL`: frontend API base URL

## Example Local Hardening
```powershell
$env:SIM_AUTH_ENABLED = "true"
$env:SIM_API_KEY = "change-me"
$env:SIM_RATE_LIMIT_PER_MINUTE = "120"
cd backend
../.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

When auth is enabled, send header:
- `x-api-key: <SIM_API_KEY>`

## Production Notes (Not Yet Implemented)
Current codebase is not production hardened. Before production:
1. Replace static API key auth with robust identity/authz.
2. Enforce trusted origins and tighten CORS.
3. Add transport/proxy body-size limits and DDoS controls.
4. Add structured audit logs and observability.
5. Add persistent storage and backup strategy for traces.
