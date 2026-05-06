import { MetricsSnapshot } from "../types";

type Props = {
  snapshot: MetricsSnapshot | null;
  isLoading: boolean;
};

function insightFromSnapshot(snapshot: MetricsSnapshot | null): string {
  if (!snapshot) {
    return "Pick a scenario and click Run Replay. The dashboard will explain what is happening as requests move through the system.";
  }

  if (snapshot.queue_depth > 3) {
    return "Requests are piling up in queue. This usually means current node capacity or routing decisions cannot keep up.";
  }

  if (snapshot.p99_latency_ms > snapshot.avg_latency_ms * 2 && snapshot.completed_requests > 0) {
    return "Most requests are fast, but some are very slow. Tail latency is high, which is risky for real users.";
  }

  return "Flow looks stable right now: queue is controlled and requests are completing at a steady pace.";
}

export function SimulationGuide({ snapshot, isLoading }: Props) {
  return (
    <section className="guide panel">
      <div>
        <p className="guide-kicker">How To Read This</p>
        <h2>Live Story Of Your Traffic</h2>
        <p>{insightFromSnapshot(snapshot)}</p>
      </div>
      <ol className="guide-steps">
        <li>Select a scenario and strategy.</li>
        <li>Run replay and watch queue and latency.</li>
        <li>Use Compare to find the safest strategy.</li>
      </ol>
      {isLoading && <p className="guide-loading">Running simulation...</p>}
    </section>
  );
}
