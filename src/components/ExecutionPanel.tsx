import { useState } from "react";
import type { ExecutionState } from "../hooks/useExecution";

interface Props {
  execution: ExecutionState;
}

export function ExecutionPanel({ execution }: Props) {
  const [showActivity, setShowActivity] = useState(true);

  return (
    <div className="execution-panel">
      <div className="execution-header">
        <div className="title">
          {execution.status === "running" && <div className="spinner" />}
          {execution.status === "running" ? `Running: ${execution.buttonName}` : `Completed: ${execution.buttonName}`}
        </div>
        {execution.status === "running" && (
          <button className="stop-btn" onClick={execution.stop}>Stop</button>
        )}
      </div>

      {execution.result && (
        <div className={`result-card ${execution.error ? "error" : "success"}`}>
          <pre>{execution.result}</pre>
        </div>
      )}

      {execution.error && (
        <div className="result-card error">
          <pre>{execution.error}</pre>
        </div>
      )}

      {execution.activities.length > 0 && (
        <>
          <button className="activity-toggle" onClick={() => setShowActivity(!showActivity)}>
            {showActivity ? "\u25BE" : "\u25B8"} Activity ({execution.activities.length} steps)
          </button>
          {showActivity && (
            <div className="activity-list">
              {execution.activities.map((a, i) => (
                <div key={i} className="activity-item">
                  {a.tool && <span className="tool-badge">{a.tool}</span>}
                  <span className="summary">{a.summary}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
