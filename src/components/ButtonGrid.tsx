import type { ButtonConfig } from "../App";
import { ButtonCard } from "./ButtonCard";

interface Props {
  buttons: ButtonConfig[];
  onRun: (button: ButtonConfig) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  runningId: string | null;
}

export function ButtonGrid({ buttons, onRun, onDelete, onAdd, runningId }: Props) {
  return (
    <div className="button-grid">
      {buttons.map((btn) => (
        <ButtonCard
          key={btn.id}
          button={btn}
          onRun={() => onRun(btn)}
          onDelete={() => onDelete(btn.id)}
          isRunning={runningId === btn.id}
        />
      ))}
      <div className="add-card" onClick={onAdd}>
        <div className="plus">+</div>
        <span>New Action</span>
      </div>
    </div>
  );
}
