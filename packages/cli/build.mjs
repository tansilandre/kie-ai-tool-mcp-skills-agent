// Publish bundle: inline @kie-ai-tool/core into a single self-contained file.
// Third-party runtime deps stay external. The task store uses node:sqlite.
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
  external: ["yargs", "zod"],
  logLevel: "info",
});

// Guard: the published artifact must never reference the unpublished core.
if (readFileSync(OUT, "utf8").includes("@kie-ai-tool/core")) {
  console.error(
    `FATAL: ${OUT} still references @kie-ai-tool/core; core was not inlined.`,
  );
  process.exit(1);
}
