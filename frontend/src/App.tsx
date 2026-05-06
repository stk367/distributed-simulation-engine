import { MetricsPanel } from "./components/MetricsPanel";
import { NodePool } from "./components/NodePool";
import { PolicyComparison } from "./components/PolicyComparison";
import { ReplayControls } from "./components/ReplayControls";
import { RequestTimeline } from "./components/RequestTimeline";
import { SimulationGuide } from "./components/SimulationGuide";
import { TraceCreator } from "./components/TraceCreator";
import { useReplaySimulation } from "./hooks/useReplaySimulation";

export function App() {
  const {
    policy,
    setPolicy,
    speed,
    setSpeed,
    traceIds,
    selectedTraceId,
    setSelectedTraceId,
    refreshTraceList,
    createTraceFromJson,
    exportSelectedTrace,
    deleteSelectedTrace,
    runReplay,
    comparePolicies,
    pause,
    play,
    seek,
    isPlaying,
    isLoading,
    snapshots,
    position,
    currentSnapshot,
    stateHash,
    comparison,
    error,
  } = useReplaySimulation();

  return (
    <main className="app">
      <header>
        <p className="eyebrow">Distributed Simulation Engine</p>
        <h1>LLM Load Balancing Replay Dashboard</h1>
        <p>
          A plain-language simulator that shows how request traffic behaves under different routing
          strategies.
        </p>
      </header>

      {error && <p className="error">{error}</p>}

      <SimulationGuide snapshot={currentSnapshot} isLoading={isLoading} />

      <ReplayControls
        policy={policy}
        onPolicyChange={setPolicy}
        speed={speed}
        onSpeedChange={setSpeed}
        traceIds={traceIds}
        selectedTraceId={selectedTraceId}
        onTraceChange={setSelectedTraceId}
        onRefreshTraces={refreshTraceList}
        onRun={runReplay}
        onComparePolicies={comparePolicies}
        onPlay={play}
        onPause={pause}
        isPlaying={isPlaying}
        canPlay={snapshots.length > 0}
        isLoading={isLoading}
      />

      <TraceCreator
        onCreateTrace={createTraceFromJson}
        onExportSelectedTrace={exportSelectedTrace}
        onDeleteSelectedTrace={deleteSelectedTrace}
        selectedTraceId={selectedTraceId}
      />

      <RequestTimeline snapshots={snapshots} currentPosition={position} onSeek={seek} />

      <PolicyComparison rows={comparison} />

      <section className="panel-grid">
        <NodePool snapshot={currentSnapshot} />
        <MetricsPanel snapshot={currentSnapshot} stateHash={stateHash} />
      </section>
    </main>
  );
}
