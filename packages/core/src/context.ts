import { constants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import { basename, isAbsolute, relative } from "node:path";
import { KieCatalog } from "./catalog.js";
import { TaskDatabase } from "./database.js";
import { KieAiClient } from "./kie-ai-client.js";
import { detectUploadMimeType } from "./media-validation.js";
import { envSetting, spendPolicyFromEnv } from "./spend-policy.js";
import { formatToolError } from "./tools/format-error.js";
import { getTool } from "./tools/index.js";
import type { ToolContext } from "./tools/types.js";
import type { KieAiConfig } from "./types.js";

function isWithinRoot(candidate: string, root: string): boolean {
  const path = relative(root, candidate);
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
}

/**
 * The API key from the environment. `KIE_AI_API_KEY` is this project's name;
 * `KIE_API_KEY` is the name kie.ai's own docs and agent skills use.
 */
export function apiKeyFromEnv(): string {
  return envSetting("KIE_AI_API_KEY") || envSetting("KIE_API_KEY") || "";
}

/** Reads the shared Kie.ai config from environment variables. */
export function configFromEnv(): KieAiConfig {
  return {
    apiKey: apiKeyFromEnv(),
    baseUrl: process.env.KIE_AI_BASE_URL || "https://api.kie.ai/api/v1",
    timeout: parseInt(process.env.KIE_AI_TIMEOUT || "60000"),
    callbackUrlFallback:
      process.env.KIE_AI_CALLBACK_URL_FALLBACK ||
      "https://proxy.kie.ai/mcp-callback",
    fileUploadBaseUrl: process.env.KIE_AI_FILE_UPLOAD_BASE_URL,
  };
}

/**
 * Build a ToolContext from the environment. Used by the CLI (and available to
 * any other adapter) so client, database and helpers are wired identically to
 * the MCP server. Throws if neither KIE_AI_API_KEY nor KIE_API_KEY is set.
 */
export function createToolContext(approvalContext = "cli"): ToolContext {
  const config = configFromEnv();
  if (!config.apiKey) {
    throw new Error(
      "Set KIE_AI_API_KEY (or KIE_API_KEY) to your kie.ai API key from https://kie.ai/api-key",
    );
  }
  const client = new KieAiClient(config);
  const db = new TaskDatabase(process.env.KIE_AI_DB_PATH);

  const configuredRoots = (process.env.KIE_CLI_UPLOAD_ROOTS || "")
    .split(",")
    .map((root) => root.trim())
    .filter(Boolean);

  return {
    client,
    db,
    catalog: new KieCatalog(client),
    spendPolicy: spendPolicyFromEnv(),
    approvalContext,
    getCallbackUrl: (url) =>
      url || process.env.KIE_AI_CALLBACK_URL || config.callbackUrlFallback,
    formatError: formatToolError,
    getTool,
    ...(configuredRoots.length > 0
      ? {
          readLocalUpload: async (path: string, maxBytes: number) => {
            const [candidate, ...roots] = await Promise.all([
              realpath(path),
              ...configuredRoots.map((root) => realpath(root)),
            ]);
            if (!roots.some((root) => isWithinRoot(candidate, root))) {
              throw new Error("file_path is outside KIE_CLI_UPLOAD_ROOTS.");
            }
            const handle = await open(
              candidate,
              constants.O_RDONLY | constants.O_NOFOLLOW,
            );
            try {
              const stat = await handle.stat();
              if (!stat.isFile() || stat.size <= 0 || stat.size > maxBytes) {
                throw new Error(
                  "file_path is empty, not a file, or exceeds the size limit.",
                );
              }
              const bytes = new Uint8Array(await handle.readFile());
              const contentType = detectUploadMimeType(bytes);
              if (!contentType)
                throw new Error("Unsupported or invalid media file.");
              return { bytes, filename: basename(candidate), contentType };
            } finally {
              await handle.close();
            }
          },
        }
      : {}),
  };
}
