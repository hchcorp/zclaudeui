import { useState, useCallback } from "react";
import { ButtonGrid } from "./components/ButtonGrid";
import { CreateButtonModal } from "./components/CreateButtonModal";
import { ExecutionPanel } from "./components/ExecutionPanel";
import { useExecution } from "./hooks/useExecution";

export interface ButtonConfig {
  id: string;
  name: string;
  prompt: string;
  cwd: string;
  color: string;
  icon: string;
  createdAt: string;
}

export default function App() {
  const [buttons, setButtons] = useState<ButtonConfig[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const execution = useExecution();

  const loadButtons = useCallback(async () => {
    const res = await fetch("/api/buttons");
    setButtons(await res.json());
    setLoaded(true);
  }, []);

  if (!loaded) {
    loadButtons();
  }

  const handleRun = (button: ButtonConfig) => {
    execution.start(button);
  };

  const handleCreate = async (data: Omit<ButtonConfig, "id" | "createdAt">) => {
    const res = await fetch("/api/buttons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const newButton = await res.json();
    setButtons((prev) => [...prev, newButton]);
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/buttons/${id}`, { method: "DELETE" });
    setButtons((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Zak-UI</h1>
      </header>

      <ButtonGrid
        buttons={buttons}
        onRun={handleRun}
        onDelete={handleDelete}
        onAdd={() => setShowModal(true)}
        runningId={execution.runningButtonId}
      />

      {execution.isActive && <ExecutionPanel execution={execution} />}

      {showModal && (
        <CreateButtonModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
