# Determinism Rules

## Mandatory Rules
- No wall-clock time in simulation logic.
- No unseeded randomness.
- No reliance on dictionary iteration order for decisions.
- Tie-breaking must use explicit stable keys (for example node id).
- Event handlers must be idempotent where possible.

## Replay Invariant
Given identical:
- input trace
- policy
- seed

The simulator must produce identical:
- ordered snapshots
- routing decisions
- aggregate metrics
- final state hash

## Allowed Non-Determinism
None in the simulation core.

## Verification
Run the same replay at least three times and assert the same final state hash.
