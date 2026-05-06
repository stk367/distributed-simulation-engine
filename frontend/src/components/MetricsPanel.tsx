import { MetricsSnapshot } from "../types";

type Props = {
  snapshot: MetricsSnapshot | null;
  stateHash: string;
};

export function MetricsPanel({ snapshot, stateHash }: Props) {
  function latencyTone(value: number): "good" | "warn" | "risk" {
    if (value <= 4) {
      return "good";
    }
    if (value <= 8) {
      return "warn";
    }
    return "risk";
  }

  function toneLabel(tone: "good" | "warn" | "risk"): string {
    if (tone === "good") {
      return "Healthy";
    }
    if (tone === "warn") {
      return "Watch";
    }
    return "Risk";
  }

  function ratio(value: number, max: number): number {
    if (!Number.isFinite(value) || max <= 0) {
      return 0;
    }
    return Math.max(0, Math.min((value / max) * 100, 100));
  }

  return (
    <section className="panel">
      <h2>Performance Snapshot</h2>
      {!snapshot && <p>No metrics yet. Run a scenario to see performance insights.</p>}
      {snapshot && (
        <>
          <div className="metrics-grid">
            <div className="metric-card">
              <p className="metric-label">Average Latency</p>
              <p className="metric-value">{snapshot.avg_latency_ms.toFixed(2)} ms</p>
              <span className={`status-chip ${latencyTone(snapshot.avg_latency_ms)}`}>
                {toneLabel(latencyTone(snapshot.avg_latency_ms))}
              </span>
            </div>
            <div className="metric-card">
              <p className="metric-label">P95 Latency</p>
              <p className="metric-value">{snapshot.p95_latency_ms.toFixed(2)} ms</p>
              <span className={`status-chip ${latencyTone(snapshot.p95_latency_ms)}`}>
                {toneLabel(latencyTone(snapshot.p95_latency_ms))}
              </span>
            </div>
            <div className="metric-card">
              <p className="metric-label">P99 Latency</p>
              <p className="metric-value">{snapshot.p99_latency_ms.toFixed(2)} ms</p>
              <span className={`status-chip ${latencyTone(snapshot.p99_latency_ms)}`}>
                {toneLabel(latencyTone(snapshot.p99_latency_ms))}
              </span>
            </div>
            <div className="metric-card">
              <p className="metric-label">Requests Still Waiting</p>
              <p className="metric-value">{snapshot.queue_depth}</p>
              <span className={`status-chip ${snapshot.queue_depth > 0 ? "warn" : "good"}`}>
                {snapshot.queue_depth > 0 ? "Queue Forming" : "Clear"}
              </span>
            </div>
          </div>

          <div className="chart-wrap metric-latency-chart" aria-label="Latency distribution chart">
            <p className="chart-title">Latency Distribution</p>
            <div className="bar-chart-grid">
              <div className="bar-chart-row">
                <span className="bar-label">Average</span>
                <div className="bar-track">
                  <div
                    className="bar-fill good"
                    style={{ width: `${ratio(snapshot.avg_latency_ms, Math.max(snapshot.p99_latency_ms, 1))}%` }}
                  />
                </div>
                <span className="bar-value">{snapshot.avg_latency_ms.toFixed(2)} ms</span>
              </div>
              <div className="bar-chart-row">
                <span className="bar-label">P95</span>
                <div className="bar-track">
                  <div
                    className="bar-fill warn"
                    style={{ width: `${ratio(snapshot.p95_latency_ms, Math.max(snapshot.p99_latency_ms, 1))}%` }}
                  />
                </div>
                <span className="bar-value">{snapshot.p95_latency_ms.toFixed(2)} ms</span>
              </div>
              <div className="bar-chart-row">
                <span className="bar-label">P99</span>
                <div className="bar-track">
                  <div className="bar-fill risk" style={{ width: "100%" }} />
                </div>
                <span className="bar-value">{snapshot.p99_latency_ms.toFixed(2)} ms</span>
              </div>
            </div>
            <div className="insight-row">
              <span className="insight-badge">
                <strong>Queue:</strong> {snapshot.queue_depth > 0 ? "Build-up detected" : "No backlog"}
              </span>
              <span className="insight-badge">
                <strong>Tail Risk:</strong>{" "}
                {snapshot.p99_latency_ms > snapshot.avg_latency_ms * 2 ? "High variance" : "Stable response time"}
              </span>
            </div>
          </div>

          <p className="panel-help">
            State fingerprint (for determinism checks): <span className="hash">{stateHash || "-"}</span>
          </p>
        </>
      )}
    </section>
  );
}
