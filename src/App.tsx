import { useState, useCallback, useEffect } from "react";
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

function getInitialTheme(): "dark" | "light" {
  const saved = localStorage.getItem("zak-ui-theme");
  if (saved === "light" || saved === "dark") return saved;
  return "dark";
}

export default function App() {
  const [buttons, setButtons] = useState<ButtonConfig[]>([]);
  const [modalMode, setModalMode] = useState<"closed" | "create" | "edit">("closed");
  const [editTarget, setEditTarget] = useState<ButtonConfig | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(getInitialTheme);
  const execution = useExecution();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("zak-ui-theme", theme);
  }, [theme]);

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
    setModalMode("closed");
  };

  const handleEdit = (button: ButtonConfig) => {
    setEditTarget(button);
    setModalMode("edit");
  };

  const handleUpdate = async (data: Omit<ButtonConfig, "id" | "createdAt">) => {
    if (!editTarget) return;
    const res = await fetch(`/api/buttons/${editTarget.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const updated = await res.json();
    setButtons((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setModalMode("closed");
    setEditTarget(null);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/buttons/${id}`, { method: "DELETE" });
    setButtons((prev) => prev.filter((b) => b.id !== id));
  };

  const handleReorder = async (reordered: ButtonConfig[]) => {
    setButtons(reordered);
    await fetch("/api/buttons", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: reordered.map((b) => b.id) }),
    });
  };

  const closeModal = () => {
    setModalMode("closed");
    setEditTarget(null);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Mada Faka</h1>
        <div className="header-actions">
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "\u2600\uFE0F" : "\u{1F319}"}
          </button>
        </div>
      </header>

      <ButtonGrid
        buttons={buttons}
        onRun={handleRun}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAdd={() => setModalMode("create")}
        onReorder={handleReorder}
        runningId={execution.runningButtonId}
      />

      {execution.isActive && <ExecutionPanel execution={execution} />}

      {modalMode !== "closed" && (
        <CreateButtonModal
          onClose={closeModal}
          onSave={modalMode === "edit" ? handleUpdate : handleCreate}
          editButton={modalMode === "edit" ? editTarget : null}
        />
      )}
    </div>
  );
}
