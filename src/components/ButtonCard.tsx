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
  onRun: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isRunning: boolean;
}

export function ButtonCard({ button, onRun, onEdit, onDelete, isRunning }: Props) {
  return (
    <div
      className={`button-card ${isRunning ? "running" : ""}`}
      style={{ "--accent-color": button.color } as React.CSSProperties}
      onClick={onRun}
    >
      <style>{`.button-card[style*="${button.color}"]::before { background: ${button.color}; }`}</style>
      <div className="actions">
        <button
          className="action-btn edit-btn"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          title="Edit"
        >
          ✎
        </button>
        <button
          className="action-btn delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
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
