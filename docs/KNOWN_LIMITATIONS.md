# Known Limitations

## Current Constraints
- No authentication or authorization on API endpoints.
- No request rate limiting.
- Stream generation is replay-first and currently computes replay output before full emission.
- Frontend schema prevalidation is minimal; backend is the source of truth for validation.

Note: Optional auth/rate-limit placeholders now exist for local hardening, but they are not a full production security model.

## V1 Scope Boundaries
- No real LLM provider invocation.
- No multi-tenant persistence.
- No production autoscaling logic.
- No distributed deployment orchestration.

## Operational Notes
- Trace storage is filesystem-based and intended for local/dev usage.
- CORS is configured for broad local use and should be tightened for production.

## Near-Term Improvements
1. Add API auth and route-level access control.
2. Add payload size and rate-limiting at transport layer.
3. Add stronger trace lifecycle operations beyond create/read/delete (for example rename and metadata).
4. Add stronger frontend schema prevalidation for imported traces.
