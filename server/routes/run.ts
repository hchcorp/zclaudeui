import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { executeButton } from "../services/agent.js";
import type { ButtonConfig } from "./buttons.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "..", "..", "data", "buttons.json");

const activeRuns = new Map<string, AbortController>();

export const runRouter = Router();

runRouter.get("/:buttonId", (req, res) => {
  const buttons: ButtonConfig[] = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  const button = buttons.find((b) => b.id === req.params.buttonId);

  if (!button) {
    return res.status(404).json({ error: "Button not found" });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const abortController = new AbortController();
  const runId = button.id + "-" + Date.now();
  activeRuns.set(runId, abortController);

  sendEvent("started", { runId, buttonName: button.name });

  executeButton(button.prompt, button.cwd, {
    onActivity: (event) => sendEvent("activity", event),
    onResult: (text, stopReason) => sendEvent("result", { text, stopReason }),
    onError: (message) => sendEvent("error", { message }),
    onDone: () => {
      sendEvent("done", {});
      activeRuns.delete(runId);
      res.end();
    },
  }, abortController.signal);

  req.on("close", () => {
    abortController.abort();
    activeRuns.delete(runId);
  });
});

runRouter.post("/stop/:runId", (req, res) => {
  const controller = activeRuns.get(req.params.runId);
  if (controller) {
    controller.abort();
    activeRuns.delete(req.params.runId);
    res.json({ stopped: true });
  } else {
    res.status(404).json({ error: "Run not found" });
  }
});
