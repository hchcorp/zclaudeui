import { useState } from "react";
import type { ButtonConfig } from "../App";

const COLORS = [
  "#4F46E5", "#7C3AED", "#EC4899", "#EF4444",
  "#F59E0B", "#22C55E", "#06B6D4", "#3B82F6",
];

const ICONS = [
  { id: "wrench", label: "\u{1F527}" },
  { id: "play", label: "\u{25B6}\u{FE0F}" },
  { id: "rocket", label: "\u{1F680}" },
  { id: "chart", label: "\u{1F4CA}" },
  { id: "shield", label: "\u{1F6E1}\u{FE0F}" },
  { id: "search", label: "\u{1F50D}" },
  { id: "gear", label: "\u{2699}\u{FE0F}" },
  { id: "bolt", label: "\u{26A1}" },
  { id: "globe", label: "\u{1F310}" },
  { id: "clipboard", label: "\u{1F4CB}" },
];

interface Props {
  onClose: () => void;
  onSave: (data: Omit<ButtonConfig, "id" | "createdAt">) => void;
  editButton?: ButtonConfig | null;
}

export function CreateButtonModal({ onClose, onSave, editButton }: Props) {
  const [name, setName] = useState(editButton?.name || "");
  const [prompt, setPrompt] = useState(editButton?.prompt || "");
  const [cwd, setCwd] = useState(editButton?.cwd || "/home/openclaw");
  const [color, setColor] = useState(editButton?.color || COLORS[0]);
  const [icon, setIcon] = useState(editButton?.icon || "play");

  const handleSubmit = () => {
    if (!name.trim() || !prompt.trim()) return;
    onSave({ name: name.trim(), prompt: prompt.trim(), cwd, color, icon });
  };

  const isEdit = !!editButton;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? "Edit Action Button" : "New Action Button"}</h2>

        <div className="field">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fix OpenClaw" autoFocus />
        </div>

        <div className="field">
          <label>Prompt (what Claude should do)</label>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. check openclaw and fix if needed" />
        </div>

        <div className="field">
          <label>Color</label>
          <div className="color-picker">
            {COLORS.map((c) => (
              <div
                key={c}
                className={`color-swatch ${color === c ? "selected" : ""}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <label>Icon</label>
          <div className="color-picker">
            {ICONS.map((ic) => (
              <div
                key={ic.id}
                className={`color-swatch ${icon === ic.id ? "selected" : ""}`}
                style={{ background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}
                onClick={() => setIcon(ic.id)}
              >
                {ic.label}
              </div>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!name.trim() || !prompt.trim()}>
            {isEdit ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
