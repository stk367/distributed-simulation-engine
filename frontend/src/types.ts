export type NodeState = {
  node_id: string;
  capacity: number;
  active_requests?: string[];
  healthy?: boolean;
  latency_window?: number[];
};

export type ReplayEvent = {
  event_id: string;
  tick: number;
  sequence: number;
  event_type:
    | "request_submitted"
    | "request_routed"
    | "request_completed"
    | "node_failure"
    | "node_recovered";
  request_id?: string;
  node_id?: string;
};

export type MetricsSnapshot = {
  tick: number;
  queue_depth: number;
  completed_requests: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  per_node_active: Record<string, number>;
  per_node_utilization: Record<string, number>;
};

export type ReplayResponse = {
  state_hash: string;
  snapshots: MetricsSnapshot[];
  total_ticks: number;
};

export type PolicyName = "round_robin" | "least_connections" | "latency_aware";

export type ReplayConfig = {
  policy: PolicyName;
  latency_window_size: number;
};

export type ReplayRunRequest = {
  config: ReplayConfig;
  nodes: NodeState[];
  events: ReplayEvent[];
};

export type TraceListResponse = {
  traces: string[];
};

export type StreamBatchPayload = {
  version: number;
  batch_size: number;
  snapshots: MetricsSnapshot[];
  state_hash: string;
  is_final: boolean;
};

export type PolicyComparisonRow = {
  policy: PolicyName;
  state_hash: string;
  avg_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  completed_requests: number;
};
