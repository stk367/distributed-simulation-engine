import type { ChangeEvent } from "react";

type Props = {
  policy: "round_robin" | "least_connections" | "latency_aware";
  onPolicyChange: (value: "round_robin" | "least_connections" | "latency_aware") => void;
  speed: number;
  onSpeedChange: (value: number) => void;
  traceIds: string[];
  selectedTraceId: string;
  onTraceChange: (value: string) => void;
  onRefreshTraces: () => void;
  onRun: () => void;
  onComparePolicies: () => void;
  onPlay: () => void;
  onPause: () => void;
  isPlaying: boolean;
  canPlay: boolean;
  isLoading: boolean;
};

type PolicyName = Props["policy"];

export function ReplayControls({
  policy,
  onPolicyChange,
  speed,
  onSpeedChange,
  traceIds,
  selectedTraceId,
  onTraceChange,
  onRefreshTraces,
  onRun,
  onComparePolicies,
  onPlay,
  onPause,
  isPlaying,
  canPlay,
  isLoading,
}: Props) {
  return (
    <section className="panel controls">
      <h2>Simulation Controls</h2>
      <p className="panel-help">Set up your scenario, then run and compare outcomes.</p>
      <label>
        Routing Strategy (who gets the next request?)
        <select
          value={policy}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            onPolicyChange(event.target.value as PolicyName)
          }
          disabled={isLoading}
        >
          <option value="round_robin">Round Robin</option>
          <option value="least_connections">Least Connections</option>
          <option value="latency_aware">Latency Aware</option>
        </select>
      </label>
      <label>
        Scenario
        <select
          value={selectedTraceId}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => onTraceChange(event.target.value)}
          disabled={isLoading || traceIds.length === 0}
        >
          {traceIds.length === 0 && <option value="">No traces found</option>}
          {traceIds.map((traceId) => (
            <option key={traceId} value={traceId}>
              {traceId}
            </option>
          ))}
        </select>
      </label>
      <label>
        Playback Speed
        <select
          value={String(speed)}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => onSpeedChange(Number(event.target.value))}
          disabled={isLoading}
        >
          <option value="0.5">0.5x</option>
          <option value="1">1x</option>
          <option value="1.5">1.5x</option>
          <option value="2">2x</option>
        </select>
      </label>
      <div className="control-actions">
        <button onClick={onRefreshTraces} disabled={isLoading}>
          Refresh Scenario List
        </button>
        <button className="button-primary" onClick={onRun} disabled={isLoading}>
          {isLoading ? "Running..." : "Run Scenario"}
        </button>
        <button onClick={onComparePolicies} disabled={isLoading}>
          Compare All Strategies
        </button>
        <button onClick={onPlay} disabled={!canPlay || isPlaying}>
          Play
        </button>
        <button onClick={onPause} disabled={!isPlaying}>
          Pause
        </button>
      </div>
      {!canPlay && <p className="panel-help">Tip: click Run Scenario to generate your timeline.</p>}
    </section>
  );
}
