import { query } from "@anthropic-ai/claude-agent-sdk";

export interface ActivityEvent {
  type: "tool_call" | "thinking" | "text";
  tool?: string;
  summary: string;
  timestamp: string;
}

export interface ExecutionCallbacks {
  onActivity: (event: ActivityEvent) => void;
  onResult: (text: string, stopReason: string) => void;
  onError: (message: string) => void;
  onDone: () => void;
}

function summarizeToolCall(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case "Bash": {
      const cmd = String(input.command || "").slice(0, 80);
      return `Ran: ${cmd}${String(input.command || "").length > 80 ? "..." : ""}`;
    }
    case "Read":
      return `Read ${input.file_path || "file"}`;
    case "Edit":
      return `Edited ${input.file_path || "file"}`;
    case "Write":
      return `Created ${input.file_path || "file"}`;
    case "Glob":
      return `Searched for ${input.pattern || "files"}`;
    case "Grep":
      return `Searched content: ${input.pattern || "pattern"}`;
    case "WebSearch":
      return `Web search: ${input.query || ""}`;
    case "WebFetch":
      return `Fetched: ${input.url || "page"}`;
    default:
      return `${toolName}`;
  }
}

export async function executeButton(
  prompt: string,
  cwd: string,
  callbacks: ExecutionCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  try {
    for await (const message of query({
      prompt,
      options: {
        cwd,
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        allowedTools: ["Read", "Edit", "Write", "Bash", "Glob", "Grep", "WebFetch", "WebSearch"],
        maxTurns: 50,
      },
    })) {
      if (signal?.aborted) break;

      if ("result" in message) {
        callbacks.onResult(message.result || "", message.stop_reason || "end_turn");
      } else if (message.type === "assistant") {
        for (const block of (message as any).content || []) {
          if (block.type === "tool_use") {
            callbacks.onActivity({
              type: "tool_call",
              tool: block.name,
              summary: summarizeToolCall(block.name, block.input || {}),
              timestamp: new Date().toISOString(),
            });
          } else if (block.type === "text" && block.text) {
            callbacks.onActivity({
              type: "text",
              summary: block.text.slice(0, 200),
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    }
    callbacks.onDone();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    callbacks.onError(msg);
    callbacks.onDone();
  }
}
