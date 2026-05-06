# Simulation Model

## Replay-First Design
The simulation runs from a trace of events and never depends on wall-clock time.

## Core Entities
- Node: execution target for routed requests
- Request: unit of work that moves through submit, route, complete lifecycle
- Event: immutable record applied in deterministic order
- Snapshot: derived state after each tick

## Event Ordering
Events are sorted by:
1. `tick` ascending
2. `sequence` ascending
3. `event_id` ascending

This ordering must be stable in every replay.

## Tick Semantics
- `tick` is an integer, not a timestamp.
- A replay step applies all events for one tick.

## Request Lifecycle
1. `request_submitted`
2. `request_routed`
3. `request_completed`

Optional events such as `node_failure` and `node_recovered` can be added later without changing ordering semantics.

## Metrics
Each snapshot includes:
- queue depth
- per-node active requests
- per-node utilization
- completed requests
- average latency
- p95 latency
- p99 latency
