import type { ButtonConfig } from "../App";

const ICONS: Record<string, string> = {
  wrench: "\u{1F527}",
  play: "\u{25B6}\u{FE0F}",
  rocket: "\u{1F680}",
  chart: "\u{1F4CA}",
  shield: "\u{1F6E1}\u{FE0F}",
  search: "\u{1F50D}",
  gear: "\u{2699}\u{FE0F}",
  bolt: "\u{26A1}",
  globe: "\u{1F310}",
  clipboard: "\u{1F4CB}",
};

interface Props {
  button: ButtonConfig;
  index: number;
  onRun: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isRunning: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isDragOver: boolean;
}

export function ButtonCard({ button, index, onRun, onEdit, onDelete, isRunning, onDragStart, onDragOver, onDrop, isDragOver }: Props) {
  return (
    <div
      className={`button-card ${isRunning ? "running" : ""} ${isDragOver ? "drag-over" : ""}`}
      style={{ "--accent-color": button.color, "--i": index } as React.CSSProperties}
      onClick={onRun}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={(e) => e.currentTarget.classList.remove("dragging")}
    >
      <div className="actions" onMouseDown={(e) => e.stopPropagation()} draggable={false}>
        <button
          className="action-btn edit-btn"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEdit(); }}
          onMouseDown={(e) => e.stopPropagation()}
          draggable={false}
          title="Edit"
        >
          ✎
        </button>
        <button
          className="action-btn delete-btn"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); }}
          onMouseDown={(e) => e.stopPropagation()}
          draggable={false}
          title="Delete"
        >
          ✕
        </button>
      </div>
      <div className="icon">{ICONS[button.icon] || ICONS.play}</div>
      <div className="name">{button.name}</div>
      <div className="prompt-preview">{button.prompt}</div>
    </div>
  );
}
