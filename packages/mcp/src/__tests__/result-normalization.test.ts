import { describe, expect, test } from "@jest/globals";
import type { ToolResult } from "@kie-ai-tool/core";
import { normalizeToolResult } from "../result-normalization.js";

function textResult(
  payload: unknown,
  extra: Partial<ToolResult> = {},
): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
    ...extra,
  };
}

describe("normalizeToolResult", () => {
  test("exposes task_id, status, api_type and error from the text envelope", () => {
    const result = normalizeToolResult(
      textResult({
        success: true,
        task_id: "veo-123",
        status: "pending",
        api_type: "veo3",
      }),
    );
    expect(result.structuredContent).toEqual({
      success: true,
      task_id: "veo-123",
      status: "pending",
      api_type: "veo3",
    });
  });

  test("mirrors every field of the text, so hosts that show only structuredContent see result URLs", () => {
    const result = normalizeToolResult(
      textResult({
        success: true,
        task_id: "t-1",
        status: "completed",
        result_urls: ["https://f.example/1.png", "https://f.example/2.png"],
      }),
    );
    expect(result.structuredContent?.result_urls).toEqual([
      "https://f.example/1.png",
      "https://f.example/2.png",
    ]);
  });

  test("keeps a tool's own structured fields and adds the rest of the text", () => {
    const original = textResult(
      { plan_id: "from-text", plan: { items: [{ price: { credits: 6 } }] } },
      { structuredContent: { plan_id: "p-1", status: "prepared" } },
    );
    expect(normalizeToolResult(original).structuredContent).toEqual({
      plan_id: "p-1",
      status: "prepared",
      plan: { items: [{ price: { credits: 6 } }] },
    });
  });

  test("leaves a structured result alone when the text isn't a JSON object", () => {
    const original: ToolResult = {
      content: [{ type: "text", text: "plain prose" }],
      structuredContent: { media_id: "m-1" },
    };
    expect(normalizeToolResult(original)).toBe(original);
  });

  test("leaves non-task results untouched", () => {
    const original = textResult({ success: true, count: 3 });
    expect(normalizeToolResult(original)).toBe(original);
  });

  test("leaves non-JSON text untouched", () => {
    const original: ToolResult = {
      content: [{ type: "text", text: "plain prose" }],
    };
    expect(normalizeToolResult(original)).toBe(original);
  });

  test("never mutates isError or text", () => {
    const original = textResult(
      { success: false, task_id: "t", error: "boom" },
      { isError: true },
    );
    const result = normalizeToolResult(original);
    expect(result.isError).toBe(true);
    expect(result.content).toBe(original.content);
    expect(result.structuredContent).toMatchObject({
      task_id: "t",
      error: "boom",
    });
  });
});
