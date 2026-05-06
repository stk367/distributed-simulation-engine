# Routing Policies

## Current Policies
- `round_robin`
- `least_connections`
- `latency_aware`

## Policy Contract
Each policy must:
- accept current node states and request map
- return a selected node id
- behave deterministically for identical input
- use explicit tie-breakers (for example, node id)

## Where to Implement
- Add policy class in `backend/app/simulation/policies.py`.
- Register policy in `create_policy(...)` factory.
- Add deterministic tests in `backend/tests/`.

## Rules for New Policies
- Never use wall-clock time in decision logic.
- Never use unseeded randomness.
- Do not mutate global/shared state from policy logic.
- Keep logic pure and side-effect-light.

## Test Expectations
For each new policy, add tests for:
- basic selection behavior
- tie behavior with deterministic ordering
- behavior under partial node failures and full capacity

## Example Checklist
1. Added policy class and factory registration.
2. Added at least one tie-break test.
3. Confirmed replay hash stability across repeated runs.
4. Confirmed no API contract changes are required.
