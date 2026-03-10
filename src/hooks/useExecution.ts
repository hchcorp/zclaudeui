import { useState, useCallback, useRef } from "react";
import type { ButtonConfig } from "../App";

export interface ActivityItem {
  type: "tool_call" | "thinking" | "text";
  tool?: string;
  summary: string;
  timestamp: string;
}

export interface ExecutionState {
  isActive: boolean;
  status: "idle" | "running" | "done" | "error";
  runningButtonId: string | null;
  buttonName: string;
  activities: ActivityItem[];
  result: string | null;
  error: string | null;
  start: (button: ButtonConfig) => void;
  stop: () => void;
  dismiss: () => void;
}

export function useExecution(): ExecutionState {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [buttonId, setButtonId] = useState<string | null>(null);
  const [buttonName, setButtonName] = useState("");
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const start = useCallback((button: ButtonConfig) => {
    eventSourceRef.current?.close();

    setStatus("running");
    setButtonId(button.id);
    setButtonName(button.name);
    setActivities([]);
    setResult(null);
    setError(null);

    const es = new EventSource(`/api/run/${button.id}`);
    eventSourceRef.current = es;

    es.addEventListener("activity", (e) => {
      const data = JSON.parse(e.data);
      setActivities((prev) => [...prev, data]);
    });

    es.addEventListener("result", (e) => {
      const data = JSON.parse(e.data);
      setResult(data.text);
    });

    es.addEventListener("error", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        setError(data.message);
      } catch {
        setError("Connection lost");
      }
    });

    es.addEventListener("done", () => {
      setStatus("done");
      es.close();
    });

    es.onerror = () => {
      if (status === "running") {
        setStatus("error");
        setError("Connection to server lost");
      }
      es.close();
    };
  }, []);

  const stop = useCallback(() => {
    eventSourceRef.current?.close();
    setStatus("done");
  }, []);

  const dismiss = useCallback(() => {
    eventSourceRef.current?.close();
    setStatus("idle");
    setButtonId(null);
    setActivities([]);
    setResult(null);
    setError(null);
  }, []);

  return {
    isActive: status !== "idle",
    status,
    runningButtonId: status === "running" ? buttonId : null,
    buttonName,
    activities,
    result,
    error,
    start,
    stop,
    dismiss,
  };
}
