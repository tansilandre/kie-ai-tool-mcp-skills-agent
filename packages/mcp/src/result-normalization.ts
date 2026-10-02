import type { ToolResult } from "@kie-ai-tool/core";

// Some MCP hosts, Claude Code among them, hand the model a tool's
// structuredContent instead of its text when both are present. A thin
// structured summary (only task_id and status, or only plan_id) then hides
// the result URLs, prices and plan details the text carries. So the
// structured result is always a superset of the JSON text: the tool's own
// structured fields win, and every other field of the text is kept. Task
// results with no structured content get the whole text object. Pure
// presentation: the text, `_meta`, and `isError` are never changed.
export function normalizeToolResult(result: ToolResult): ToolResult {
  const text = result.content[0]?.text;
  let parsed: Record<string, unknown> | undefined;
  if (text) {
    try {
      const value: unknown = JSON.parse(text);
      if (typeof value === "object" && value !== null && !Array.isArray(value))
        parsed = value as Record<string, unknown>;
    } catch {
      // Plain prose: nothing to mirror.
    }
  }
  if (result.structuredContent !== undefined) {
    return parsed
      ? {
          ...result,
          structuredContent: { ...parsed, ...result.structuredContent },
        }
      : result;
  }
  if (!parsed || typeof parsed.task_id !== "string") return result;
  return { ...result, structuredContent: parsed };
}
