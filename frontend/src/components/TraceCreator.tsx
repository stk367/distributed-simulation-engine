import { useState } from "react";
import type { ChangeEvent } from "react";

const MAX_IMPORT_BYTES = 1_000_000;
const TRACE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;

type Props = {
  onCreateTrace: (traceId: string, traceJson: string) => Promise<void>;
  onExportSelectedTrace: () => Promise<string>;
  onDeleteSelectedTrace: () => Promise<void>;
  selectedTraceId: string;
};

const SAMPLE_TRACE = {
  config: {
    policy: "round_robin",
    latency_window_size: 20,
  },
  nodes: [
    { node_id: "node-a", capacity: 2 },
    { node_id: "node-b", capacity: 2 },
  ],
  events: [
    { event_id: "e1", tick: 0, sequence: 0, event_type: "request_submitted", request_id: "r1" },
    { event_id: "e2", tick: 1, sequence: 0, event_type: "request_routed", request_id: "r1" },
    { event_id: "e3", tick: 3, sequence: 0, event_type: "request_completed", request_id: "r1" },
  ],
};

export function TraceCreator({
  onCreateTrace,
  onExportSelectedTrace,
  onDeleteSelectedTrace,
  selectedTraceId,
}: Props) {
  const [traceId, setTraceId] = useState("");
  const [traceJson, setTraceJson] = useState(JSON.stringify(SAMPLE_TRACE, null, 2));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit() {
    setMessage("");
    setIsSubmitting(true);
    try {
      await onCreateTrace(traceId, traceJson);
      setMessage("Trace created successfully.");
      setTraceId("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to create trace");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setMessage("");
    try {
      if (file.size > MAX_IMPORT_BYTES) {
        throw new Error("Trace file is too large (max 1 MB).");
      }

      const text = await file.text();
      JSON.parse(text);
      setTraceJson(text);
      if (!traceId) {
        const baseName = file.name.replace(/\.json$/i, "").trim();
        const normalized = baseName.replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 120);
        if (TRACE_ID_PATTERN.test(normalized)) {
          setTraceId(normalized);
        }
      }
      setMessage("Trace file loaded into editor.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Selected file is not valid JSON.");
    } finally {
      event.target.value = "";
    }
  }

  async function onExport() {
    setMessage("");
    try {
      const jsonText = await onExportSelectedTrace();
      const blob = new Blob([jsonText], { type: "application/json" });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `${selectedTraceId}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);
      setMessage("Trace exported.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to export trace");
    }
  }

  async function onDelete() {
    if (!selectedTraceId) {
      setMessage("Select a trace to delete.");
      return;
    }

    const confirmed = window.confirm(`Delete trace '${selectedTraceId}'? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setMessage("");
    try {
      await onDeleteSelectedTrace();
      setMessage("Trace deleted.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to delete trace");
    }
  }

  return (
    <section className="panel trace-creator">
      <h2>Create Trace</h2>
      <label>
        Trace Id
        <input
          value={traceId}
          onChange={(event) => setTraceId(event.target.value)}
          placeholder="example-trace"
          disabled={isSubmitting}
        />
      </label>
      <label>
        Trace JSON
        <textarea
          value={traceJson}
          onChange={(event) => setTraceJson(event.target.value)}
          rows={10}
          spellCheck={false}
          disabled={isSubmitting}
        />
      </label>
      <div className="control-actions">
        <label className="file-input-label">
          Import JSON File
          <input type="file" accept="application/json,.json" onChange={onImportFile} />
        </label>
        <button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Trace"}
        </button>
        <button onClick={onExport} disabled={!selectedTraceId || isSubmitting}>
          Export Selected Trace
        </button>
        <button onClick={onDelete} disabled={!selectedTraceId || isSubmitting}>
          Delete Selected Trace
        </button>
      </div>
      {message && <p className="trace-message">{message}</p>}
    </section>
  );
}
