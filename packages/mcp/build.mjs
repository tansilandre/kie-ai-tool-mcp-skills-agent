// Publish bundle: inline @kie-ai-tool/core into a single self-contained file
// so the published package never depends on the unpublished core workspace.
// Third-party runtime deps stay external (declared in package.json). The task
// store uses Node's built-in node:sqlite, so there is no native module.
import { build } from "esbuild";
import { readFileSync } from "fs";

const OUT = "dist/index.js";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outfile: OUT,
  external: ["@modelcontextprotocol/sdk", "zod", "express"],
  logLevel: "info",
});

// Guard: the published artifact must never reference the unpublished core.
if (readFileSync(OUT, "utf8").includes("@kie-ai-tool/core")) {
  console.error(
    `FATAL: ${OUT} still references @kie-ai-tool/core; core was not inlined.`,
  );
  process.exit(1);
}
