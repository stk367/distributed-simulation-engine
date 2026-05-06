import { useEffect, useMemo, useRef, useState } from "react";

import {
  MetricsSnapshot,
  NodeState,
  PolicyComparisonRow,
  PolicyName,
  ReplayEvent,
  ReplayResponse,
  ReplayRunRequest,
  StreamBatchPayload,
  TraceListResponse,
} from "../types";

const API_BASE = "http://127.0.0.1:8000";
const RESOLVED_API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || API_BASE;

const DEFAULT_NODES: NodeState[] = [
  { node_id: "node-a", capacity: 3 },
  { node_id: "node-b", capacity: 2 },
  { node_id: "node-c", capacity: 4 },
];

const DEFAULT_EVENTS: ReplayEvent[] = [
  { event_id: "e1", tick: 0, sequence: 0, event_type: "request_submitted", request_id: "r1" },
  { event_id: "e2", tick: 0, sequence: 1, event_type: "request_submitted", request_id: "r2" },
  { event_id: "e3", tick: 0, sequence: 2, event_type: "request_submitted", request_id: "r3" },
  { event_id: "e4", tick: 1, sequence: 0, event_type: "request_routed", request_id: "r1" },
  { event_id: "e5", tick: 1, sequence: 1, event_type: "request_routed", request_id: "r2" },
  { event_id: "e6", tick: 2, sequence: 0, event_type: "request_routed", request_id: "r3" },
  { event_id: "e7", tick: 4, sequence: 0, event_type: "request_completed", request_id: "r1" },
  { event_id: "e8", tick: 5, sequence: 0, event_type: "request_completed", request_id: "r2" },
  { event_id: "e9", tick: 6, sequence: 0, event_type: "request_completed", request_id: "r3" },
];

export function useReplaySimulation() {
  const [policy, setPolicy] = useState<PolicyName>("round_robin");
  const [snapshots, setSnapshots] = useState<MetricsSnapshot[]>([]);
  const [stateHash, setStateHash] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const [traceIds, setTraceIds] = useState<string[]>([]);
  const [selectedTraceId, setSelectedTraceId] = useState<string>("");
  const [tracePayload, setTracePayload] = useState<ReplayRunRequest | null>(null);
  const [comparison, setComparison] = useState<PolicyComparisonRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [isTraceLoading, setIsTraceLoading] = useState(false);
  const traceLoadControllerRef = useRef<AbortController | null>(null);
  const replayStreamControllerRef = useRef<AbortController | null>(null);

  function basePayload(): ReplayRunRequest {
    if (selectedTraceId) {
      if (!tracePayload) {
        throw new Error("Selected trace is still loading");
      }
      return tracePayload;
    }
    return {
      config: {
        policy,
        latency_window_size: 20,
      },
      nodes: DEFAULT_NODES,
      events: DEFAULT_EVENTS,
    };
  }

  async function refreshTraceList() {
    const response = await fetch(`${RESOLVED_API_BASE}/traces`);
    if (!response.ok) {
      throw new Error(`Trace list request failed: ${response.status}`);
    }
    const data = (await response.json()) as TraceListResponse;
    setTraceIds(data.traces);
    setSelectedTraceId((current) => {
      if (data.traces.length === 0) {
        return "";
      }
      if (current && data.traces.includes(current)) {
        return current;
      }
      return data.traces[0];
    });
  }

  async function ensureDemoTrace() {
    const demoTraceId = "demo-trace";
    const listResponse = await fetch(`${RESOLVED_API_BASE}/traces`);
    if (!listResponse.ok) {
      throw new Error(`Trace list request failed: ${listResponse.status}`);
    }
    const listData = (await listResponse.json()) as TraceListResponse;
    if (listData.traces.includes(demoTraceId)) {
      return;
    }

    const createResponse = await fetch(`${RESOLVED_API_BASE}/traces`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        trace_id: demoTraceId,
        payload: {
          config: {
            policy: "round_robin",
            latency_window_size: 20,
          },
          nodes: DEFAULT_NODES,
          events: DEFAULT_EVENTS,
        },
      }),
    });

    if (!createResponse.ok && createResponse.status !== 400) {
      throw new Error(`Trace creation failed: ${createResponse.status}`);
    }
  }

  async function loadSelectedTrace(traceId: string) {
    if (!traceId) {
      traceLoadControllerRef.current?.abort();
      traceLoadControllerRef.current = null;
      setIsTraceLoading(false);
      setTracePayload(null);
      return;
    }

    traceLoadControllerRef.current?.abort();
    const controller = new AbortController();
    traceLoadControllerRef.current = controller;
    setIsTraceLoading(true);
    setTracePayload(null);

    try {
      const response = await fetch(`${RESOLVED_API_BASE}/traces/${encodeURIComponent(traceId)}`, {
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Trace load failed: ${response.status}`);
      }
      const payload = (await response.json()) as ReplayRunRequest;
      if (traceLoadControllerRef.current === controller) {
        setTracePayload(payload);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      throw err;
    } finally {
      if (traceLoadControllerRef.current === controller) {
        traceLoadControllerRef.current = null;
        setIsTraceLoading(false);
      }
    }
  }

  async function bootstrapTraces() {
    setError("");
    try {
      await ensureDemoTrace();
      await refreshTraceList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize traces");
    }
  }

  async function runReplay() {
    if (isTraceLoading || (selectedTraceId && !tracePayload)) {
      setError("Selected trace is still loading");
      return;
    }

    replayStreamControllerRef.current?.abort();
    const streamController = new AbortController();
    replayStreamControllerRef.current = streamController;

    setError("");
    setIsLoading(true);
    setComparison([]);
    setSnapshots([]);
    setPosition(0);
    try {
      const payload = basePayload();
      const streamParams = new URLSearchParams({
        batch_size: "3",
        policy,
        latency_window_size: String(payload.config.latency_window_size),
      });
      const response = selectedTraceId
        ? await fetch(
            `${RESOLVED_API_BASE}/stream/traces/${encodeURIComponent(selectedTraceId)}/snapshots?${streamParams.toString()}`,
            {
              method: "POST",
              signal: streamController.signal,
            },
          )
        : await fetch(`${RESOLVED_API_BASE}/stream/snapshots?batch_size=3`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            signal: streamController.signal,
            body: JSON.stringify({
              ...payload,
              config: {
                ...payload.config,
                policy,
              },
            }),
          });

      if (!response.ok || !response.body) {
        throw new Error(`Replay stream failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let collected: MetricsSnapshot[] = [];
      let lastVersion = 0;

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split("\\n\\n");
        buffer = messages.pop() ?? "";

        for (const message of messages) {
          const lines = message.split("\n").map((line) => line.trim());
          const dataLines = lines
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice("data:".length).trim());
          if (dataLines.length === 0) {
            continue;
          }
          const rawPayload = dataLines.join("\n");
          if (rawPayload === "{}") {
            continue;
          }

          const payload = JSON.parse(rawPayload) as StreamBatchPayload;
          if (payload.version <= lastVersion) {
            continue;
          }
          if (payload.version !== lastVersion + 1) {
            throw new Error("Out-of-order stream batch version detected");
          }
          lastVersion = payload.version;
          collected = [...collected, ...payload.snapshots];
          setSnapshots(collected);
          setStateHash(payload.state_hash);
        }
      }

      setPosition(0);
      setIsPlaying(collected.length > 0);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err.message : "Unknown replay error");
      setIsPlaying(false);
    } finally {
      if (replayStreamControllerRef.current === streamController) {
        replayStreamControllerRef.current = null;
      }
      setIsLoading(false);
    }
  }

  async function comparePolicies() {
    if (isTraceLoading || (selectedTraceId && !tracePayload)) {
      setError("Selected trace is still loading");
      return;
    }

    setError("");
    setComparison([]);
    setIsLoading(true);
    try {
      const payload = basePayload();
      const policies: PolicyName[] = ["round_robin", "least_connections", "latency_aware"];
      const rows: PolicyComparisonRow[] = [];

      for (const currentPolicy of policies) {
        const runParams = new URLSearchParams({
          policy: currentPolicy,
          latency_window_size: String(payload.config.latency_window_size),
        });
        const response = selectedTraceId
          ? await fetch(
              `${RESOLVED_API_BASE}/traces/${encodeURIComponent(selectedTraceId)}/run?${runParams.toString()}`,
              {
                method: "POST",
              },
            )
          : await fetch(`${RESOLVED_API_BASE}/replay/run`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                ...payload,
                config: {
                  ...payload.config,
                  policy: currentPolicy,
                },
              }),
            });

        if (!response.ok) {
          throw new Error(`Policy comparison failed: ${response.status}`);
        }

        const data = (await response.json()) as ReplayResponse;
        const lastSnapshot = data.snapshots[data.snapshots.length - 1];
        rows.push({
          policy: currentPolicy,
          state_hash: data.state_hash,
          avg_latency_ms: lastSnapshot?.avg_latency_ms ?? 0,
          p95_latency_ms: lastSnapshot?.p95_latency_ms ?? 0,
          p99_latency_ms: lastSnapshot?.p99_latency_ms ?? 0,
          completed_requests: lastSnapshot?.completed_requests ?? 0,
        });
      }

      setComparison(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown policy comparison error");
    } finally {
      setIsLoading(false);
    }
  }

  function refreshTraceListSafe() {
    refreshTraceList().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to refresh traces");
    });
  }

  async function createTraceFromJson(traceId: string, traceJson: string) {
    const normalizedTraceId = traceId.trim();
    if (!normalizedTraceId) {
      throw new Error("Trace id is required");
    }

    let payload: unknown;
    try {
      payload = JSON.parse(traceJson);
    } catch {
      throw new Error("Trace JSON is invalid");
    }

    const response = await fetch(`${RESOLVED_API_BASE}/traces`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        trace_id: normalizedTraceId,
        payload,
      }),
    });

    if (!response.ok) {
      const errorDetail = await response
        .json()
        .then((body: { detail?: string }) => body.detail || `Trace creation failed: ${response.status}`)
        .catch(() => `Trace creation failed: ${response.status}`);
      throw new Error(errorDetail);
    }

    await refreshTraceList();
    setSelectedTraceId(normalizedTraceId);
  }

  async function exportSelectedTrace(): Promise<string> {
    if (!selectedTraceId) {
      throw new Error("Select a trace to export");
    }

    const response = await fetch(`${RESOLVED_API_BASE}/traces/${encodeURIComponent(selectedTraceId)}`);
    if (!response.ok) {
      const errorDetail = await response
        .json()
        .then((body: { detail?: string }) => body.detail || `Trace export failed: ${response.status}`)
        .catch(() => `Trace export failed: ${response.status}`);
      throw new Error(errorDetail);
    }

    const payload = (await response.json()) as ReplayRunRequest;
    return JSON.stringify(payload, null, 2);
  }

  async function deleteSelectedTrace(): Promise<void> {
    if (!selectedTraceId) {
      throw new Error("Select a trace to delete");
    }

    const deletingTraceId = selectedTraceId;
    const response = await fetch(`${RESOLVED_API_BASE}/traces/${encodeURIComponent(deletingTraceId)}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorDetail = await response
        .json()
        .then((body: { detail?: string }) => body.detail || `Trace delete failed: ${response.status}`)
        .catch(() => `Trace delete failed: ${response.status}`);
      throw new Error(errorDetail);
    }

    await refreshTraceList();
    if (deletingTraceId === selectedTraceId) {
      setTracePayload(null);
    }
  }

  function pause() {
    setIsPlaying(false);
  }

  function play() {
    if (snapshots.length > 0) {
      setIsPlaying(true);
    }
  }

  function seek(nextPosition: number) {
    if (snapshots.length === 0) {
      return;
    }
    const bounded = Math.max(0, Math.min(nextPosition, snapshots.length - 1));
    setPosition(bounded);
  }

  useEffect(() => {
    bootstrapTraces();
  }, []);

  useEffect(() => {
    loadSelectedTrace(selectedTraceId).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to load selected trace");
    });
  }, [selectedTraceId]);

  useEffect(() => {
    return () => {
      traceLoadControllerRef.current?.abort();
      replayStreamControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!isPlaying || snapshots.length === 0) {
      return;
    }

    const delayMs = Math.max(120, Math.floor(700 / speed));
    const timer = window.setInterval(() => {
      setPosition((current: number) => {
        if (current >= snapshots.length - 1) {
          setIsPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, delayMs);

    return () => window.clearInterval(timer);
  }, [isPlaying, snapshots, speed]);

  const currentSnapshot = useMemo(
    () => (snapshots.length > 0 ? snapshots[position] : null),
    [snapshots, position],
  );

  return {
    policy,
    setPolicy,
    speed,
    setSpeed,
    traceIds,
    selectedTraceId,
    setSelectedTraceId,
    refreshTraceList: refreshTraceListSafe,
    createTraceFromJson,
    exportSelectedTrace,
    deleteSelectedTrace,
    runReplay,
    comparePolicies,
    pause,
    play,
    seek,
    isPlaying,
    isLoading: isLoading || isTraceLoading,
    snapshots,
    position,
    currentSnapshot,
    stateHash,
    comparison,
    error,
  };
}
