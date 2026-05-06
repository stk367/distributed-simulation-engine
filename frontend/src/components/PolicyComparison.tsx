import { PolicyComparisonRow } from "../types";

type Props = {
  rows: PolicyComparisonRow[];
};

export function PolicyComparison({ rows }: Props) {
  const sorted = [...rows].sort((a, b) => {
    if (a.completed_requests !== b.completed_requests) {
      return b.completed_requests - a.completed_requests;
    }
    if (a.p99_latency_ms !== b.p99_latency_ms) {
      return a.p99_latency_ms - b.p99_latency_ms;
    }
    if (a.p95_latency_ms !== b.p95_latency_ms) {
      return a.p95_latency_ms - b.p95_latency_ms;
    }
    return a.avg_latency_ms - b.avg_latency_ms;
  });

  const bestPolicy = sorted[0]?.policy;
  const policyLabel: Record<PolicyComparisonRow["policy"], string> = {
    round_robin: "Round Robin",
    least_connections: "Least Connections",
    latency_aware: "Latency Aware",
  };

  const maxCompleted = Math.max(...sorted.map((row) => row.completed_requests), 1);

  return (
    <section className="panel">
      <h2>Strategy Comparison</h2>
      {rows.length === 0 && <p>Run comparison to evaluate all policies on the selected trace.</p>}
      {rows.length > 0 && (
        <>
          <p className="panel-help">
            Recommended strategy for this scenario: <strong>{policyLabel[bestPolicy] ?? "Unknown Policy"}</strong>
          </p>
          <div className="chart-wrap">
            <p className="chart-title">Requests Completed by Strategy</p>
            <div className="bar-chart-grid">
              {sorted.map((row) => (
                <div className="bar-chart-row" key={`${row.policy}-bar`}>
                  <span className="bar-label">{policyLabel[row.policy]}</span>
                  <div className="bar-track">
                    <div
                      className={`bar-fill ${row.policy === bestPolicy ? "good" : "info"}`}
                      style={{ width: `${(row.completed_requests / maxCompleted) * 100}%` }}
                    />
                  </div>
                  <span className="bar-value">{row.completed_requests}</span>
                </div>
              ))}
            </div>
          </div>

          <table>
            <caption className="table-caption">Strategy outcomes for this trace replay</caption>
            <thead>
              <tr>
                <th scope="col">Strategy</th>
                <th scope="col">Finished</th>
                <th scope="col">Average Delay</th>
                <th scope="col">P95</th>
                <th scope="col">P99</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.policy} className={row.policy === bestPolicy ? "row-best" : ""}>
                  <td>{policyLabel[row.policy]}</td>
                  <td>{row.completed_requests}</td>
                  <td>{row.avg_latency_ms.toFixed(2)} ms</td>
                  <td>{row.p95_latency_ms.toFixed(2)} ms</td>
                  <td>{row.p99_latency_ms.toFixed(2)} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
