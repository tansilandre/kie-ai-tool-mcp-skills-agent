import type { KieCatalog } from "../catalog.js";
import type { ToolContext, ToolResult } from "./types.js";

export function requireCatalog(ctx: ToolContext): KieCatalog {
  if (!ctx.catalog) {
    throw new Error(
      "The live kie.ai catalog is not available in this adapter. Update the server or CLI.",
    );
  }
  return ctx.catalog;
}

export function jsonResult(
  body: Record<string, unknown>,
  structuredContent?: Record<string, unknown>,
): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(body, null, 2) }],
    ...(structuredContent ? { structuredContent } : {}),
  };
}

/** First sentence of kie.ai's price text, short enough for a search listing. */
export function shortPrice(
  text: string | null | undefined,
): string | undefined {
  if (!text) return undefined;
  const line = text.split("\n")[0].trim();
  return line.length > 180 ? `${line.slice(0, 179)}…` : line;
}
