import { MetricsSnapshot } from "../types";

type Props = {
  snapshots: MetricsSnapshot[];
  currentPosition: number;
  onSeek: (nextPosition: number) => void;
};

export function RequestTimeline({ snapshots, currentPosition, onSeek }: Props) {
  const progress =
    snapshots.length > 1 ? Math.round((currentPosition / (snapshots.length - 1)) * 100) : 0;

  const recentSnapshots = snapshots.slice(-24);
  const maxQueueDepth = Math.max(...recentSnapshots.map((item) => item.queue_depth), 1);

  return (
    <section className="panel">
      <h2>Replay Timeline</h2>
      {snapshots.length === 0 && <p>Run replay to generate timeline snapshots.</p>}
      {snapshots.length > 0 && (
        <>
          <p className="panel-help">Progress through simulation: {progress}%</p>
          <input
            type="range"
            min={0}
            max={snapshots.length - 1}
            value={currentPosition}
            aria-label="Replay position"
            onChange={(event) => onSeek(Number(event.target.value))}
          />

          <div className="chart-wrap">
            <p className="chart-title">Queue Trend (recent steps)</p>
            <div className="sparkline-bars" aria-label="Queue depth trend chart">
              {recentSnapshots.map((item) => (
                <div
                  key={item.tick}
                  className={`spark-bar ${item.queue_depth > 0 ? "warn" : "good"}`}
                  style={{ height: `${Math.max((item.queue_depth / maxQueueDepth) * 100, 6)}%` }}
                  title={`Step ${item.tick}: queue ${item.queue_depth}`}
                />
              ))}
            </div>
          </div>

          <div className="timeline-row">
            <div className="timeline-stat">
              <span className="timeline-stat-label">Current Step</span>
              <span className="timeline-stat-value">{snapshots[currentPosition].tick}</span>
            </div>
            <div className="timeline-stat">
              <span className="timeline-stat-label">Queue Size</span>
              <span className="timeline-stat-value">{snapshots[currentPosition].queue_depth}</span>
            </div>
            <div className="timeline-stat">
              <span className="timeline-stat-label">Completed Requests</span>
              <span className="timeline-stat-value">{snapshots[currentPosition].completed_requests}</span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
