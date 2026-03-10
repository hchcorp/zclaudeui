import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "..", "..", "data", "buttons.json");

export interface ButtonConfig {
  id: string;
  name: string;
  prompt: string;
  cwd: string;
  color: string;
  icon: string;
  createdAt: string;
}

function readButtons(): ButtonConfig[] {
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw);
}

function writeButtons(buttons: ButtonConfig[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(buttons, null, 2));
}

export const buttonsRouter = Router();

buttonsRouter.get("/", (_req, res) => {
  res.json(readButtons());
});

buttonsRouter.post("/", (req, res) => {
  const buttons = readButtons();
  const newButton: ButtonConfig = {
    id: uuidv4(),
    name: req.body.name,
    prompt: req.body.prompt,
    cwd: req.body.cwd || "/home/openclaw",
    color: req.body.color || "#4F46E5",
    icon: req.body.icon || "play",
    createdAt: new Date().toISOString(),
  };
  buttons.push(newButton);
  writeButtons(buttons);
  res.status(201).json(newButton);
});

buttonsRouter.put("/:id", (req, res) => {
  const buttons = readButtons();
  const idx = buttons.findIndex((b) => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  buttons[idx] = { ...buttons[idx], ...req.body, id: req.params.id };
  writeButtons(buttons);
  res.json(buttons[idx]);
});

buttonsRouter.delete("/:id", (req, res) => {
  let buttons = readButtons();
  buttons = buttons.filter((b) => b.id !== req.params.id);
  writeButtons(buttons);
  res.status(204).end();
});
