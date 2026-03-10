import { useState } from "react";
import type { ButtonConfig } from "../App";
import { ButtonCard } from "./ButtonCard";

interface Props {
  buttons: ButtonConfig[];
  onRun: (button: ButtonConfig) => void;
  onEdit: (button: ButtonConfig) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onReorder: (buttons: ButtonConfig[]) => void;
  runningId: string | null;
}

export function ButtonGrid({ buttons, onRun, onEdit, onDelete, onAdd, onReorder, runningId }: Props) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    (e.currentTarget as HTMLElement).classList.add("dragging");
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIdx(idx);
  };

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const reordered = [...buttons];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(dropIdx, 0, moved);
    onReorder(reordered);
    setDragIdx(null);
    setOverIdx(null);
  };

  return (
    <div className="button-grid" onDragOver={(e) => e.preventDefault()}>
      {buttons.map((btn, i) => (
        <ButtonCard
          key={btn.id}
          button={btn}
          onRun={() => onRun(btn)}
          onEdit={() => onEdit(btn)}
          onDelete={() => onDelete(btn.id)}
          isRunning={runningId === btn.id}
          onDragStart={(e) => handleDragStart(e, i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={(e) => handleDrop(e, i)}
          isDragOver={overIdx === i && dragIdx !== i}
        />
      ))}
      <div className="add-card" onClick={onAdd}>
        <div className="plus">+</div>
        <span>New Action</span>
      </div>
    </div>
  );
}
