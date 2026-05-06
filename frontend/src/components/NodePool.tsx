import { MetricsSnapshot } from "../types";

type Props = {
  snapshot: MetricsSnapshot | null;
};

export function NodePool({ snapshot }: Props) {
  function normalizeUtilization(value: number | undefined): number {
    const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
    return Math.max(0, Math.min(safeValue, 1));
  }

  function nodeStatus(utilization: number): { label: string; tone: "good" | "warn" | "risk" } {
    if (utilization < 0.6) {
      return { label: "Comfortable", tone: "good" };
    }
    if (utilization < 0.85) {
      return { label: "Busy", tone: "warn" };
    }
    return { label: "Near Limit", tone: "risk" };
  }

  return (
    <section className="panel">
      <h2>Node Health</h2>
      {!snapshot && <p>No snapshot available.</p>}
      {snapshot && (
        <>
          <div className="insight-row">
            <span className="insight-badge">
              <strong>How to read:</strong> Higher bar means busier node.
            </span>
            <span className="insight-badge">
              <strong>Goal:</strong> Keep all nodes in Comfortable or Busy zones.
            </span>
          </div>

          <div className="node-cards node-cards-visual">
            {Object.keys(snapshot.per_node_active)
              .sort()
              .map((nodeId) => {
                const utilization = normalizeUtilization(snapshot.per_node_utilization[nodeId]);
                const status = nodeStatus(utilization);
                return (
                  <article key={nodeId} className={`node-card ${status.tone}`}>
                    <div className="node-card-header">
                      <p className="node-name">{nodeId}</p>
                      <span className={`status-chip ${status.tone}`}>{status.label}</span>
                    </div>
                    <p className={`node-pct ${status.tone}`}>{(utilization * 100).toFixed(0)}%</p>
                    <div className="load-track">
                      <div className={`load-fill ${status.tone}`} style={{ width: `${utilization * 100}%` }} />
                    </div>
                    <p className="metric-desc">Active requests: {snapshot.per_node_active[nodeId] ?? 0}</p>
                  </article>
                );
              })}
          </div>
        </>
      )}
    </section>
  );
}
